from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

# DTO schema for Roles
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Input schema for registration
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    account_type: Literal["fan", "operator"] = "fan"

# Output schema for user profiles
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[RoleBase] = []

    model_config = ConfigDict(from_attributes=True)

# Input schema for logins
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Output token parameters response
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int

# Input request for password recovery triggers
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Input schema for password resets
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
