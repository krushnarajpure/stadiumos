from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class StadiumResponse(BaseModel):
    id: str
    name: str
    location: str
    total_capacity: int

    model_config = ConfigDict(from_attributes=True)

class ThresholdResponse(BaseModel):
    busy_pct: float
    critical_pct: float

    model_config = ConfigDict(from_attributes=True)

class ZoneResponse(BaseModel):
    id: str
    name: str
    stadium_id: str
    max_capacity: int
    status: str
    thresholds: Optional[ThresholdResponse] = None

    model_config = ConfigDict(from_attributes=True)

class EntranceResponse(BaseModel):
    id: str
    name: str
    zone_id: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class ExitResponse(BaseModel):
    id: str
    name: str
    zone_id: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class CrowdSnapshotCreate(BaseModel):
    zone_id: str
    headcount: int = Field(..., ge=0)

class CrowdSnapshotResponse(BaseModel):
    id: str
    zone_id: str
    headcount: int
    occupancy_pct: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CrowdAlertCreate(BaseModel):
    zone_id: str
    severity: str = Field(..., pattern="^(Warning|Critical|Emergency)$")
    message: str

class CrowdAlertResponse(BaseModel):
    id: str
    zone_id: str
    severity: str
    message: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ThresholdUpdate(BaseModel):
    busy_pct: float = Field(..., ge=1.0, le=100.0)
    critical_pct: float = Field(..., ge=1.0, le=100.0)

class HeatmapDataResponse(BaseModel):
    zone_id: str
    zone_name: str
    occupancy_pct: float
    headcount: int
    status: str
