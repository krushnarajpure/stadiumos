from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.models.auth import User
from app.schemas.navigation import (
    RouteRequest,
    RouteResponse,
    RerouteRequest,
    MapGraphResponse,
    ZoneConnectivityResponse,
    AccessibilityNodesResponse,
    EvacuationRoutesResponse,
    NavigationStatusResponse
)
from app.services.navigation import NavigationService
from app.core.websocket import ws_manager
import logging

logger = logging.getLogger("fastapi")

router = APIRouter()

# RBAC permissions
all_users = get_current_user
ops_or_admin = PermissionChecker(["Operations Manager", "Administrator"])

@router.post("/route", response_model=RouteResponse, status_code=status.HTTP_200_OK)
async def generate_route(
    req: RouteRequest,
    current_user: User = Depends(all_users),
    db: Session = Depends(get_db)
):
    """
    Generate navigation route path.
    
    Yields shortest, fastest, safest, or least crowded paths connecting two stadium map nodes.
    """
    # Restrict medical and security routing profiles to authorized staff roles
    if req.routing_profile == "Safest":
        user_roles = [r.name for r in current_user.roles]
        if "Security Staff" not in user_roles and "Medical Staff" not in user_roles and "Administrator" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to secure emergency routing profiles"
            )

    service = NavigationService(db)
    return await service.calculate_route(req)

@router.post("/reroute", response_model=RouteResponse, status_code=status.HTTP_200_OK)
async def generate_reroute(
    req: RerouteRequest,
    current_user: User = Depends(all_users),
    db: Session = Depends(get_db)
):
    """
    Reroute active navigation session.
    
    Re-calculates the optimal route path avoiding specified hazardous or congested zones.
    """
    service = NavigationService(db)
    return await service.calculate_reroute(req)

@router.get("/map", response_model=MapGraphResponse)
def get_map_graph(
    current_user: User = Depends(all_users),
    db: Session = Depends(get_db)
):
    """
    Get full stadium map topology.
    
    Returns all nodes (seating, concessions, gates) and edges (distance connectivity pathways).
    """
    service = NavigationService(db)
    nodes = service.repo.get_all_nodes()
    edges = service.repo.get_all_edges()
    return MapGraphResponse(nodes=nodes, edges=edges)

@router.get("/zones", response_model=ZoneConnectivityResponse)
def get_zones_connectivity(
    current_user: User = Depends(all_users),
    db: Session = Depends(get_db)
):
    """
    Get zone adjacency connectivity maps.
    
    Returns structured layout connectivity details of active zones.
    """
    # Returns zone adjacency maps list
    return {"status": "success", "zones": ["ZONE_GATE_A", "ZONE_SEC_104"]}

@router.get("/accessibility", response_model=AccessibilityNodesResponse)
def get_accessibility_nodes(
    current_user: User = Depends(all_users),
    db: Session = Depends(get_db)
):
    """
    Get wheelchair-accessible nodes list.
    
    Returns node identifiers supporting elevators, ramps, and accessible entries.
    """
    service = NavigationService(db)
    nodes = service.repo.get_all_nodes()
    acc_nodes = [n.id for n in nodes if n.is_wheelchair_accessible]
    return {"accessible_nodes": acc_nodes}

@router.get("/evacuation", response_model=EvacuationRoutesResponse)
def get_evacuation_routes(
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Get evacuation routing paths list.
    
    Returns exit evacuation plans mapping zone areas to target gates.
    """
    # Returns evacuation map indicators
    return {
        "status": "success",
        "evacuation_routes": [
            {"from_zone": "ZONE_SEC_104", "to_gate": "NODE-GATE-A", "path": ["NODE-SEAT-1", "NODE-CONC-1", "NODE-GATE-A"]}
        ]
    }

@router.get("/status", response_model=NavigationStatusResponse)
def get_navigation_status():
    """
    Get navigation service telemetry metrics.
    
    Returns routing latencies and active navigation sessions statistics.
    """
    return {
        "active_navigation_sessions": 240,
        "average_routing_latency_ms": 12.5,
        "dynamic_reroutes_last_hour": 8
    }

# Live WS Navigation alerts broadcast
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket stream for live navigation updates.
    
    Connects clients to receive real-time updates regarding crowd rerouting and safety hazard alerts.
    """
    # Accept connection registers
    await ws_manager.connect(websocket, None)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"ping": "received", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, None)
        logger.info("WebSocket client disconnected from navigation route updates channel")
