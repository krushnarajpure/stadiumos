import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class MapNode(Base):
    __tablename__ = "map_nodes"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    zone_id = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False) # e.g. "Gate", "Turnstile", "Concourse", "Seat", "Parking", "MedicalStation"
    x = Column(Float, nullable=False) # Coordinate mapping
    y = Column(Float, nullable=False)
    floor = Column(String(10), default="1", nullable=False)
    is_wheelchair_accessible = Column(Boolean, default=True, nullable=False)

class MapEdge(Base):
    __tablename__ = "map_edges"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_node_id = Column(String(255), ForeignKey("map_nodes.id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(String(255), ForeignKey("map_nodes.id", ondelete="CASCADE"), nullable=False)
    distance = Column(Float, nullable=False) # Distance in meters
    base_weight = Column(Float, nullable=False) # Base traversal cost multiplier
    current_weight = Column(Float, nullable=False) # Real-time dynamically adjusted cost weight
    description = Column(String(255), nullable=True)
    is_wheelchair_accessible = Column(Boolean, default=True, nullable=False)

    # Relationships
    source_node = relationship("MapNode", foreign_keys=[source_node_id])
    target_node = relationship("MapNode", foreign_keys=[target_node_id])
