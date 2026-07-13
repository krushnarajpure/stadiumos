from pydantic import BaseModel, Field, ConfigDict
from typing import List

class RouteRequest(BaseModel):
    start_node_id: str
    end_node_id: str
    routing_profile: str = Field("Shortest", pattern="^(Shortest|Fastest|Safest|LeastCrowded)$")
    requires_accessibility: bool = False

class RouteNodeResponse(BaseModel):
    id: str
    name: str
    zone_id: str
    type: str
    floor: str

class RouteResponse(BaseModel):
    path_nodes: List[RouteNodeResponse]
    total_distance_meters: float
    estimated_time_seconds: float
    routing_profile: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    timestamp: str

class RerouteRequest(BaseModel):
    current_node_id: str
    end_node_id: str
    avoid_zones: List[str] = []
    requires_accessibility: bool = False

class MapNodeResponse(BaseModel):
    id: str
    name: str
    zone_id: str
    type: str
    x: float
    y: float
    floor: str
    is_wheelchair_accessible: bool

    model_config = ConfigDict(from_attributes=True)

class MapEdgeResponse(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    distance: float
    base_weight: float
    current_weight: float
    is_wheelchair_accessible: bool

    model_config = ConfigDict(from_attributes=True)

class MapGraphResponse(BaseModel):
    nodes: List[MapNodeResponse]
    edges: List[MapEdgeResponse]

class ZoneConnectivityResponse(BaseModel):
    status: str = Field(..., description="API connectivity status", json_schema_extra={"example": "success"})
    zones: List[str] = Field(..., description="Adjacency connectivity list of zone identifiers", json_schema_extra={"example": ["ZONE_GATE_A", "ZONE_SEC_104"]})

class AccessibilityNodesResponse(BaseModel):
    accessible_nodes: List[str] = Field(..., description="List of wheelchair accessible node identifiers", json_schema_extra={"example": ["NODE-SEAT-1", "NODE-CONC-1"]})

class EvacuationRouteDetail(BaseModel):
    from_zone: str = Field(..., description="Origin zone identifier", json_schema_extra={"example": "ZONE_SEC_104"})
    to_gate: str = Field(..., description="Target exit gate node identifier", json_schema_extra={"example": "NODE-GATE-A"})
    path: List[str] = Field(..., description="Sequential node paths for safe evacuation routing", json_schema_extra={"example": ["NODE-SEAT-1", "NODE-CONC-1", "NODE-GATE-A"]})

class EvacuationRoutesResponse(BaseModel):
    status: str = Field(..., description="API evacuation status", json_schema_extra={"example": "success"})
    evacuation_routes: List[EvacuationRouteDetail] = Field(..., description="Structured details of optimal evacuation routing paths")

class NavigationStatusResponse(BaseModel):
    active_navigation_sessions: int = Field(..., description="Total active user routing sessions", json_schema_extra={"example": 240})
    average_routing_latency_ms: float = Field(..., description="Average API latency response time in milliseconds", json_schema_extra={"example": 12.5})
    dynamic_reroutes_last_hour: int = Field(..., description="Total real-time path adjustments triggered in the past hour", json_schema_extra={"example": 8})

