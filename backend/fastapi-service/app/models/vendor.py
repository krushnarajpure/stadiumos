import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False) # e.g. "Food", "Beverage", "Merchandise"
    zone_id = Column(String(255), nullable=False)
    status = Column(String(50), default="Active", nullable=False)

    # Relationships
    inventories = relationship("VendorInventory", back_populates="vendor", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # e.g. "Drink", "Food", "Apparel"
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)

    # Relationships
    inventories = relationship("VendorInventory", back_populates="product", cascade="all, delete-orphan")

class VendorInventory(Base):
    __tablename__ = "vendor_inventories"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id = Column(String(255), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(255), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    min_threshold = Column(Integer, default=10, nullable=False)
    max_capacity = Column(Integer, default=500, nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="inventories")
    product = relationship("Product", back_populates="inventories")

class RestockOrder(Base):
    __tablename__ = "restock_orders"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id = Column(String(255), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(255), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String(50), default="Requested", nullable=False) # "Requested", "Transit", "Completed"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    vendor = relationship("Vendor")
    product = relationship("Product")
