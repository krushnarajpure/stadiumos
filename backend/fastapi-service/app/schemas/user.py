from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.auth import RoleBase

class UserProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfileResponse(UserProfileBase):
    avatar_url: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AccessibilityBase(BaseModel):
    requires_wheelchair: bool = False
    visual_assistance: bool = False
    audio_assistance: bool = False
    special_requirements: Optional[str] = None

class AccessibilityUpdate(AccessibilityBase):
    pass

class AccessibilityResponse(AccessibilityBase):
    model_config = ConfigDict(from_attributes=True)

class EmergencyContactBase(BaseModel):
    contact_name: str
    relationship: str
    phone_number: str

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactResponse(EmergencyContactBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class UserProfileFullResponse(BaseModel):
    id: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[RoleBase] = []
    profile: Optional[UserProfileResponse] = None
    accessibility: Optional[AccessibilityResponse] = None
    emergency_contacts: List[EmergencyContactResponse] = []

    model_config = ConfigDict(from_attributes=True)

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role_name: str

class UserActivityLogResponse(BaseModel):
    id: str
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
