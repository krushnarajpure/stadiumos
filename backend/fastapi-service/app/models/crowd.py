import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Stadium(Base):
    __tablename__ = "stadiums"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    total_capacity = Column(Integer, nullable=False)

    # Relationships
    zones = relationship("Zone", back_populates="stadium", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    stadium_id = Column(String(255), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    max_capacity = Column(Integer, nullable=False)
    status = Column(String(50), default="Normal", nullable=False) # "Normal", "Busy", "Critical"

    # Relationships
    stadium = relationship("Stadium", back_populates="zones")
    entrances = relationship("Entrance", back_populates="zone", cascade="all, delete-orphan")
    exits = relationship("Exit", back_populates="zone", cascade="all, delete-orphan")
    thresholds = relationship("OccupancyThreshold", back_populates="zone", uselist=False, cascade="all, delete-orphan")

class Entrance(Base):
    __tablename__ = "entrances"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="Active", nullable=False) # "Active", "Congested", "Closed"

    # Relationships
    zone = relationship("Zone", back_populates="entrances")

class Exit(Base):
    __tablename__ = "exits"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="Active", nullable=False)

    # Relationships
    zone = relationship("Zone", back_populates="exits")

class CrowdSnapshot(Base):
    __tablename__ = "crowd_snapshots"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    headcount = Column(Integer, nullable=False)
    occupancy_pct = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CrowdAlert(Base):
    __tablename__ = "crowd_alerts"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(50), nullable=False) # "Warning", "Critical", "Emergency"
    message = Column(String(512), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class OccupancyThreshold(Base):
    __tablename__ = "occupancy_thresholds"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    busy_pct = Column(Float, default=70.0, nullable=False)
    critical_pct = Column(Float, default=90.0, nullable=False)

    # Relationships
    zone = relationship("Zone", back_populates="thresholds")

class CrowdHistory(Base):
    __tablename__ = "crowd_histories"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String(255), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    headcount = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
