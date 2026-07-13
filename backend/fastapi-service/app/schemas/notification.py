from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=3)
    type: str = Field(..., pattern="^(Emergency|Crowd|Medical|Security|Navigation|Volunteer|Vendor|Transport|Weather|AIRecommendation)$")
    channel: str = Field("In-App", pattern="^(WebSocket|Push|Email|SMS|In-App)$")
    priority: str = Field("Normal", pattern="^(Low|Normal|High|Urgent)$")

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str]
    title: str
    message: str
    type: str
    channel: str
    priority: str
    status: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationBroadcast(BaseModel):
    roles: List[str] = Field(..., description="Target role scopes to receive broadcast")
    title: str
    message: str
    type: str
    priority: str = "Normal"

class PreferenceItem(BaseModel):
    channel: str
    is_enabled: bool

class NotificationPreferenceUpdate(BaseModel):
    preferences: List[PreferenceItem]

class NotificationPreferenceResponse(BaseModel):
    channel: str
    is_enabled: bool

    model_config = ConfigDict(from_attributes=True)

class BroadcastResponse(BaseModel):
    message: str = Field(..., description="API broadcast confirmation status message", json_schema_extra={"example": "Role broadcast completed"})
    dispatched_records_count: int = Field(..., description="Total count of successfully dispatched notification records", json_schema_extra={"example": 12})

