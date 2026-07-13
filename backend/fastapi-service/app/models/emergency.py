import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    type = Column(String(100), nullable=False) # e.g. "Medical Emergency", "Security Threat", "Fire Alarm", "Crowd Stampede Risk"
    status = Column(String(50), default="Reported", nullable=False) # "Reported", "Dispatched", "Active", "Resolving", "Resolved"
    severity = Column(String(50), default="Medium", nullable=False) # "Low", "Medium", "High", "Critical"
    zone_id = Column(String(255), nullable=False)
    assigned_user_id = Column(String(255), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    sla_due_at = Column(DateTime, nullable=False)

    # Relationships
    assigned_user = relationship("User", backref="assigned_incidents")

class IncidentHistory(Base):
    __tablename__ = "incident_histories"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(255), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False) # e.g. "CREATE", "ASSIGN", "STATUS_CHANGE", "RESOLVE"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", backref="history_logs")
