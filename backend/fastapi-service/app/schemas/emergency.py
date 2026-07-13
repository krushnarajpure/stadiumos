from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    type: str = Field(..., pattern="^(Medical Emergency|Security Threat|Fire Alarm|Crowd Stampede Risk|Suspicious Object|Lost Child|Missing Person|Equipment Failure|Power Outage|Weather Emergency)$")
    severity: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    zone_id: str

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    status: str
    severity: str
    zone_id: str
    assigned_user_id: Optional[str]
    reported_at: datetime
    resolved_at: Optional[datetime]
    sla_due_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Reported|Dispatched|Active|Resolving|Resolved)$")

class IncidentAssign(BaseModel):
    assigned_user_id: str

class IncidentEscalate(BaseModel):
    escalation_reason: str = Field(..., min_length=5)

class IncidentResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=5)

class IncidentHistoryResponse(BaseModel):
    id: str
    incident_id: str
    actor_id: str
    action: str
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SeverityCount(BaseModel):
    severity: str
    count: int

class TypeCount(BaseModel):
    type: str
    count: int

class IncidentDashboardResponse(BaseModel):
    active_incidents_count: int
    severity_distribution: List[SeverityCount]
    type_distribution: List[TypeCount]
    sla_compliance_rate: float # Percentage of resolved incidents within SLA
