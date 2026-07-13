from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.emergency import Incident, IncidentHistory
from typing import List, Optional, Tuple

class EmergencyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_incident(self, id: str) -> Optional[Incident]:
        return self.db.query(Incident).filter(Incident.id == id).first()

    def create_incident(self, incident: Incident) -> Incident:
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def update_incident(self) -> None:
        self.db.commit()

    def create_history(self, history: IncidentHistory) -> IncidentHistory:
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_incidents_list(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        zone_id: Optional[str] = None
    ) -> Tuple[List[Incident], int]:
        query = self.db.query(Incident)
        
        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        if zone_id:
            query = query.filter(Incident.zone_id == zone_id)

        total = query.count()
        results = query.order_by(Incident.reported_at.desc()).offset(skip).limit(limit).all()
        return results, total

    def get_active_count(self) -> int:
        return self.db.query(Incident).filter(Incident.status != "Resolved").count()

    def get_severity_counts(self) -> List[Tuple[str, int]]:
        return self.db.query(Incident.severity, func.count(Incident.id))\
            .filter(Incident.status != "Resolved")\
            .group_by(Incident.severity).all()

    def get_type_counts(self) -> List[Tuple[str, int]]:
        return self.db.query(Incident.type, func.count(Incident.id))\
            .filter(Incident.status != "Resolved")\
            .group_by(Incident.type).all()

    def get_sla_compliance_metrics(self) -> Tuple[int, int]:
        # Count total resolved incidents and those resolved before SLA due
        total_resolved = self.db.query(Incident).filter(Incident.status == "Resolved").count()
        resolved_on_time = self.db.query(Incident).filter(
            Incident.status == "Resolved",
            Incident.resolved_at <= Incident.sla_due_at
        ).count()
        return resolved_on_time, total_resolved
