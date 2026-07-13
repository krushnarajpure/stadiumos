from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, PermissionChecker
from app.models.auth import User
from app.schemas.emergency import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentAssign,
    IncidentEscalate,
    IncidentResolve,
    IncidentHistoryResponse,
    IncidentDashboardResponse
)
from app.services.emergency import EmergencyService
from app.core.websocket import ws_manager
from typing import List, Optional
import logging

logger = logging.getLogger("fastapi")

router = APIRouter()

# RBAC permission groups
security_or_medical_or_ops = PermissionChecker(["Security Staff", "Medical Staff", "Operations Manager", "Administrator"])
ops_or_admin = PermissionChecker(["Operations Manager", "Administrator"])

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Create a new emergency incident.
    
    Logs a new safety or medical incident and triggers broadcast dispatches.
    """
    service = EmergencyService(db)
    return service.create_incident(current_user.id, incident_in)

@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    List all emergency incidents.
    
    Lists safety incident records filtered by status, severity, and zone.
    """
    service = EmergencyService(db)
    incidents, _ = service.list_incidents(skip, limit, status, severity, zone_id)
    return incidents

@router.get("/dashboard", response_model=IncidentDashboardResponse)
def get_dashboard(
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Get emergency dashboard metrics.
    
    Returns total counts of active, resolving, and escalated incident metrics.
    """
    service = EmergencyService(db)
    return service.get_dashboard_metrics()

@router.get("/{id}", response_model=IncidentResponse)
def get_incident_by_id(
    id: str,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Get incident record by ID.
    
    Retrieves detailed values of the specified emergency incident.
    """
    service = EmergencyService(db)
    incident = service.repo.get_incident(id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident record not found")
    return incident

@router.patch("/{id}/status", response_model=IncidentResponse)
def update_incident_status(
    id: str,
    status_in: IncidentStatusUpdate,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Update incident status.
    
    Sets the workflow status state of the specified safety incident.
    """
    service = EmergencyService(db)
    return service.change_status(current_user.id, id, status_in)

@router.patch("/{id}/assign", response_model=IncidentResponse)
def assign_incident_responder(
    id: str,
    assign_in: IncidentAssign,
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Assign incident responder.
    
    Links an active security or medical responder to handle the emergency.
    """
    service = EmergencyService(db)
    return service.assign_incident(current_user.id, id, assign_in)

@router.post("/{id}/escalate", response_model=IncidentResponse)
def escalate_incident(
    id: str,
    escalate_in: IncidentEscalate,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Escalate safety incident.
    
    Elevates incident severity level and dispatches additional alerts to operations teams.
    """
    service = EmergencyService(db)
    return service.escalate_incident(current_user.id, id, escalate_in)

@router.post("/{id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    id: str,
    resolve_in: IncidentResolve,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Resolve safety incident.
    
    Closes the incident report log with details on resolution actions.
    """
    service = EmergencyService(db)
    return service.resolve_incident(current_user.id, id, resolve_in)

@router.get("/{id}/history", response_model=List[IncidentHistoryResponse])
def get_incident_history(
    id: str,
    current_user: User = Depends(security_or_medical_or_ops),
    db: Session = Depends(get_db)
):
    """
    Get incident log history.
    
    Yields audit trail details of status updates and dispatcher notes for the incident.
    """
    service = EmergencyService(db)
    incident = service.repo.get_incident(id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident record not found")
    return incident.history_logs

# WebSocket stream for live emergency alerts
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Accept connections globals
    await ws_manager.connect(websocket, None)
    try:
        while True:
            # Maintain active connection
            data = await websocket.receive_text()
            await websocket.send_json({"ping": "received", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, None)
