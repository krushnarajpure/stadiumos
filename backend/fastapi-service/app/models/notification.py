import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Null represents public broadcasts
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(100), nullable=False) # e.g. "Emergency", "Crowd", "Medical", "Security", "AIRecommendation"
    channel = Column(String(50), nullable=False) # "WebSocket", "Push", "Email", "SMS", "In-App"
    priority = Column(String(50), default="Normal", nullable=False) # "Low", "Normal", "High", "Urgent"
    status = Column(String(50), default="Pending", nullable=False) # "Pending", "Sent", "Failed"
    is_read = Column(Boolean, default=False, nullable=False)
    retry_count = Column(DateTime, default=datetime.utcnow, nullable=False) # Using datetime as tracking timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(50), nullable=False) # "Push", "Email", "SMS", "In-App"
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", backref="notification_preferences")
