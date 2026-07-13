import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.session import Base

# Association Table for User <-> Role (Many-to-Many)
UserRoles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(255), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(255), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

# Association Table for Role <-> Permission (Many-to-Many)
RolePermissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(255), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(255), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    roles = relationship("Role", secondary=UserRoles, back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    # Relationships
    users = relationship("User", secondary=UserRoles, back_populates="roles")
    permissions = relationship("Permission", secondary=RolePermissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    # Relationships
    roles = relationship("Role", secondary=RolePermissions, back_populates="permissions")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    token = Column(String(512), unique=True, nullable=False, index=True)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")
