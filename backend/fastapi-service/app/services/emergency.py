from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.repositories.emergency import EmergencyRepository
from app.repositories.user import UserRepository
from app.models.emergency import Incident, IncidentHistory
from app.schemas.emergency import (
    IncidentCreate, IncidentStatusUpdate, IncidentAssign, IncidentEscalate, IncidentResolve,
    IncidentDashboardResponse, SeverityCount, TypeCount
)
from app.core.redis_client import redis_client
from app.core.kafka_client import kafka_client
from shared.utils.error_handlers import ValidationError
from typing import Optional

class EmergencyService:
    def __init__(self, db: Session):
        self.repo = EmergencyRepository(db)
        self.user_repo = UserRepository(db)

    def _calculate_sla_duration(self, severity: str) -> timedelta:
        # Emergency SLAs: Critical (5m), High (15m), Medium (30m), Low (60m)
        durations = {
            "Critical": timedelta(minutes=5),
            "High": timedelta(minutes=15),
            "Medium": timedelta(minutes=30),
            "Low": timedelta(minutes=60)
        }
        return durations.get(severity, timedelta(minutes=30))

    def create_incident(self, actor_id: str, incident_in: IncidentCreate) -> Incident:
        duration = self._calculate_sla_duration(incident_in.severity)
        sla_due = datetime.utcnow() + duration

        incident = Incident(
            title=incident_in.title,
            description=incident_in.description,
            type=incident_in.type,
            severity=incident_in.severity,
            zone_id=incident_in.zone_id,
            status="Reported",
            sla_due_at=sla_due
        )
        self.repo.create_incident(incident)

        # Log history event
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=actor_id,
            action="CREATE",
            notes=f"Incident reported. SLA Due: {sla_due.isoformat()}Z"
        )
        self.repo.create_history(history)

        # Cache active state to Redis
        redis_client.set_cache(f"emergency:incident:{incident.id}:status", "Reported", ttl=3600)

        # Publish EmergencyCreated event to Kafka
        kafka_client.publish_event(
            "stadiumos.emergency.created",
            key=incident.id,
            payload={
                "incident_id": incident.id,
                "type": incident.type,
                "severity": incident.severity,
                "zone_id": incident.zone_id
            }
        )

        return incident

    def assign_incident(self, actor_id: str, incident_id: str, assign_in: IncidentAssign) -> Incident:
        incident = self.repo.get_incident(incident_id)
        if not incident:
            raise ValidationError("Incident profile not found")

        target_user = self.user_repo.get_by_id(assign_in.assigned_user_id)
        if not target_user:
            raise ValidationError("Target responder user not found")

        # Enforce role alignment constraints
        user_roles = [r.name for r in target_user.roles]
        if "Medical Emergency" in incident.type and "Medical Staff" not in user_roles and "Administrator" not in user_roles:
            raise ValidationError("Only Medical Staff can be assigned to medical emergency incidents")
        if "Security Threat" in incident.type and "Security Staff" not in user_roles and "Administrator" not in user_roles:
            raise ValidationError("Only Security Staff can be assigned to security incidents")

        incident.assigned_user_id = target_user.id
        incident.status = "Dispatched"
        self.repo.update_incident()

        # Log history event
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=actor_id,
            action="ASSIGN",
            notes=f"Assigned to user: {target_user.email}"
        )
        self.repo.create_history(history)

        # Publish EmergencyAssigned event to Kafka
        kafka_client.publish_event(
            "stadiumos.emergency.assigned",
            key=incident.id,
            payload={
                "incident_id": incident.id,
                "responder_id": target_user.id
            }
        )

        return incident

    def escalate_incident(self, actor_id: str, incident_id: str, escalate_in: IncidentEscalate) -> Incident:
        incident = self.repo.get_incident(incident_id)
        if not incident:
            raise ValidationError("Incident profile not found")

        # Escalate severity rank
        severity_ranks = ["Low", "Medium", "High", "Critical"]
        current_idx = severity_ranks.index(incident.severity)
        if current_idx < len(severity_ranks) - 1:
            new_severity = severity_ranks[current_idx + 1]
            incident.severity = new_severity
            
            # Recalculate SLA due timer based on escalation timestamp
            duration = self._calculate_sla_duration(new_severity)
            incident.sla_due_at = datetime.utcnow() + duration

        self.repo.update_incident()

        # Log history event
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=actor_id,
            action="ESCALATE",
            notes=f"Escalated: {escalate_in.escalation_reason}. New Severity: {incident.severity}"
        )
        self.repo.create_history(history)

        # Publish EmergencyEscalated event to Kafka
        kafka_client.publish_event(
            "stadiumos.emergency.escalated",
            key=incident.id,
            payload={
                "incident_id": incident.id,
                "new_severity": incident.severity,
                "reason": escalate_in.escalation_reason
            }
        )

        return incident

    def resolve_incident(self, actor_id: str, incident_id: str, resolve_in: IncidentResolve) -> Incident:
        incident = self.repo.get_incident(incident_id)
        if not incident:
            raise ValidationError("Incident profile not found")

        incident.status = "Resolved"
        incident.resolved_at = datetime.utcnow()
        self.repo.update_incident()

        # Log history event
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=actor_id,
            action="RESOLVE",
            notes=f"Resolved: {resolve_in.resolution_notes}"
        )
        self.repo.create_history(history)

        # Remove cache from Redis
        redis_client.delete_cache(f"emergency:incident:{incident.id}:status")

        # Publish EmergencyResolved event to Kafka
        kafka_client.publish_event(
            "stadiumos.emergency.resolved",
            key=incident.id,
            payload={
                "incident_id": incident.id,
                "notes": resolve_in.resolution_notes
            }
        )

        return incident

    def change_status(self, actor_id: str, incident_id: str, status_in: IncidentStatusUpdate) -> Incident:
        incident = self.repo.get_incident(incident_id)
        if not incident:
            raise ValidationError("Incident profile not found")

        incident.status = status_in.status
        self.repo.update_incident()

        # Log history event
        history = IncidentHistory(
            incident_id=incident.id,
            actor_id=actor_id,
            action="STATUS_CHANGE",
            notes=f"Status transitioned to: {status_in.status}"
        )
        self.repo.create_history(history)

        # Update cache in Redis
        redis_client.set_cache(f"emergency:incident:{incident.id}:status", status_in.status, ttl=3600)

        return incident

    def get_dashboard_metrics(self) -> IncidentDashboardResponse:
        active_count = self.repo.get_active_count()
        
        severity_rows = self.repo.get_severity_counts()
        severity_dist = [SeverityCount(severity=r[0], count=r[1]) for r in severity_rows]
        
        type_rows = self.repo.get_type_counts()
        type_dist = [TypeCount(type=r[0], count=r[1]) for r in type_rows]

        on_time, total = self.repo.get_sla_compliance_metrics()
        sla_rate = (on_time / total * 100.0) if total > 0 else 100.0

        return IncidentDashboardResponse(
            active_incidents_count=active_count,
            severity_distribution=severity_dist,
            type_distribution=type_dist,
            sla_compliance_rate=sla_rate
        )

    def list_incidents(self, skip: int, limit: int, status: Optional[str], severity: Optional[str], zone_id: Optional[str]):
        return self.repo.get_incidents_list(skip, limit, status, severity, zone_id)
