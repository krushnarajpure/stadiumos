from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, PermissionChecker
from app.models.auth import User
from app.schemas.crowd import (
    ZoneResponse,
    CrowdSnapshotCreate,
    CrowdSnapshotResponse,
    CrowdAlertCreate,
    CrowdAlertResponse,
    ThresholdUpdate,
    HeatmapDataResponse
)
from app.schemas.common import MessageResponse
from app.services.crowd import CrowdService
from app.core.websocket import ws_manager
from typing import List, Optional

router = APIRouter()

# RBAC permission groups
security_or_ops = PermissionChecker(["Security Staff", "Operations Manager", "Administrator"])
ops_or_admin = PermissionChecker(["Operations Manager", "Administrator"])
all_staff = PermissionChecker(["Security Staff", "Operations Manager", "Administrator", "Medical Staff"])

@router.get("/zones", response_model=List[ZoneResponse])
def get_zones(
    stadium_id: Optional[str] = Query(None, description="Filter zones by Stadium ID"),
    current_user: User = Depends(all_staff),
    db: Session = Depends(get_db)
):
    """
    Get all stadium zones.
    
    Lists the occupancy thresholds and details of active stadium seating or gate zones.
    """
    service = CrowdService(db)
    return service.get_all_zones(stadium_id)

@router.get("/zones/{id}", response_model=ZoneResponse)
def get_zone_by_id(id: str, current_user: User = Depends(all_staff), db: Session = Depends(get_db)):
    """
    Get stadium zone by ID.
    
    Returns seat capacities and crowd settings for the specified zone.
    """
    service = CrowdService(db)
    return service.get_zone(id)

@router.post("/snapshot", response_model=CrowdSnapshotResponse, status_code=status.HTTP_201_CREATED)
async def create_snapshot(
    snapshot_in: CrowdSnapshotCreate,
    current_user: User = Depends(security_or_ops),
    db: Session = Depends(get_db)
):
    """
    Record crowd headcount snapshot.
    
    Logs active crowd estimates and updates zone congestion levels.
    """
    service = CrowdService(db)
    return await service.record_snapshot(snapshot_in)

@router.post("/alert", response_model=CrowdAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_in: CrowdAlertCreate,
    current_user: User = Depends(security_or_ops),
    db: Session = Depends(get_db)
):
    """
    Raise a custom crowd congestion alert.
    
    Triggers local push alerts and broadcasts websocket events for safety responses.
    """
    service = CrowdService(db)
    return await service.raise_custom_alert(alert_in)

@router.get("/live", response_model=List[CrowdAlertResponse])
def get_live_alerts(
    zone_id: Optional[str] = Query(None, description="Filter alerts by Zone ID"),
    current_user: User = Depends(all_staff),
    db: Session = Depends(get_db)
):
    """
    Get active live crowd alerts.
    
    Lists unresolved safety alerts triggered by occupancy overflow.
    """
    service = CrowdService(db)
    return service.get_live_alerts(zone_id)

@router.patch("/zones/{id}/threshold", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def update_zone_threshold(
    id: str,
    threshold_in: ThresholdUpdate,
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Update zone occupancy thresholds.
    
    Configures critical limit indicators for crowd congestion trigger monitors.
    """
    service = CrowdService(db)
    service.modify_thresholds(id, threshold_in)
    return {"message": "Zone occupancy thresholds updated successfully"}

@router.get("/heatmap", response_model=List[HeatmapDataResponse])
def get_heatmap(current_user: User = Depends(all_staff), db: Session = Depends(get_db)):
    """
    Get crowd heatmap metrics.
    
    Yields seating capacity ratios and absolute coordinates for density displays.
    """
    service = CrowdService(db)
    return service.get_heatmap_metrics()

@router.get("/history", response_model=List[CrowdSnapshotResponse])
def get_history(
    zone_id: str = Query(..., description="Target Zone ID"),
    limit: int = Query(50, description="Records limit"),
    current_user: User = Depends(all_staff),
    db: Session = Depends(get_db)
):
    """
    Get historical snapshot logs.
    
    Lists historical attendance and crowd snapshots registered in a specific zone.
    """
    service = CrowdService(db)
    return service.get_historical_logs(zone_id, limit)

# WebSocket streaming gateway endpoint
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, zone_id: Optional[str] = None):
    # Accept connection and register subscription
    await ws_manager.connect(websocket, zone_id)
    try:
        while True:
            # Maintain connection loop, receive client ping messages
            data = await websocket.receive_text()
            await websocket.send_json({"pong": True, "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, zone_id)
