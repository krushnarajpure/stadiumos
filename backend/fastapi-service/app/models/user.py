import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, JSON
from sqlalchemy.orm import relationship, backref
from app.db.session import Base

# Association Table for User <-> Language (Many-to-Many)
UserLanguages = Table(
    "user_languages",
    Base.metadata,
    Column("user_id", String(255), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("language_code", String(10), ForeignKey("languages.code", ondelete="CASCADE"), primary_key=True)
)

class Language(Base):
    __tablename__ = "languages"
    code = Column(String(10), primary_key=True) # e.g. "en", "es", "de"
    name = Column(String(100), nullable=False)

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    address = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref=backref("profile", uselist=False))

class AccessibilityPreference(Base):
    __tablename__ = "accessibility_preferences"

    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    requires_wheelchair = Column(Boolean, default=False, nullable=False)
    visual_assistance = Column(Boolean, default=False, nullable=False)
    audio_assistance = Column(Boolean, default=False, nullable=False)
    special_requirements = Column(String(512), nullable=True)

    # Relationships
    user = relationship("User", backref=backref("accessibility", uselist=False))

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_name = Column(String(255), nullable=False)
    relationship_type = Column(String(100), nullable=False)
    phone_number = Column(String(50), nullable=False)

    # Relationships
    user = relationship("User", backref="emergency_contacts")

class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(255), nullable=False) # e.g. "LOGIN", "UPDATE_PROFILE", "DELETE_ACCOUNT"
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="activity_logs")

class UserAuditLog(Base):
    __tablename__ = "user_audit_logs"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(255), nullable=False) # ID of user executing action
    action = Column(String(100), nullable=False) # e.g. "ASSIGN_ROLE", "STATUS_CHANGE"
    target_id = Column(String(255), nullable=False) # ID of user receiving changes
    changes = Column(JSON, nullable=False) # JSON diff payload of changes
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
