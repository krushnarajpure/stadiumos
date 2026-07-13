from fastapi import APIRouter, Depends, Query, status, Response, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.models.auth import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationBroadcast,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
    BroadcastResponse
)
from app.services.notification import NotificationService
from typing import List

router = APIRouter()

# RBAC permission groups
ops_or_admin = PermissionChecker(["Operations Manager", "Administrator"])

@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notify_in: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create and dispatch a notification log.
    
    Publishes personal notifications to the subscriber's account. Admins/Operations managers can target any user.
    """
    # Users can only dispatch notifications to themselves, except admins/ops managers
    if notify_in.user_id and notify_in.user_id != current_user.id:
        user_roles = [r.name for r in current_user.roles]
        if "Administrator" not in user_roles and "Operations Manager" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not possess authority permissions to trigger alerts targeting other users."
            )

    service = NotificationService(db)
    return await service.send_notification(notify_in)

@router.get("/", response_model=List[NotificationResponse])
def list_my_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List own active notification history.
    
    Lists the past notifications pushed to the caller profile session.
    """
    service = NotificationService(db)
    notifications, _ = service.get_user_history(current_user.id, skip, limit)
    return notifications

@router.get("/history", response_model=List[NotificationResponse])
def get_notifications_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user notification history.
    
    Yields paginated history details of notifications dispatched to the user.
    """
    service = NotificationService(db)
    notifications, _ = service.get_user_history(current_user.id, skip, limit)
    return notifications

@router.get("/{id}", response_model=NotificationResponse)
def get_notification_by_id(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notification by log ID.
    
    Retrieves detailed values of the specified notification.
    """
    service = NotificationService(db)
    notification = service.repo.get_notification(id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found")
        
    if notification.user_id and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to target notification history")
        
    return notification

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark notification as read.
    
    Sets the read status flag for the target notification log.
    """
    service = NotificationService(db)
    notification = service.repo.get_notification(id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found")
        
    if notification.user_id and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    notification.is_read = True
    service.repo.update_notification(notification)
    return notification

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete notification log record.
    
    Permanently purges a specific notification log item.
    """
    service = NotificationService(db)
    notification = service.repo.get_notification(id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found")
        
    if notification.user_id and notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    service.repo.delete_notification(notification)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/broadcast", response_model=BroadcastResponse, status_code=status.HTTP_200_OK)
async def broadcast_notification(
    broadcast: NotificationBroadcast,
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Broadcast notification to roles.
    
    Pushes emergency alerts or general broadcast messages to all users belonging to target authorization roles.
    """
    service = NotificationService(db)
    sent_count = await service.dispatch_role_broadcast(broadcast)
    return {"message": "Role broadcast completed", "dispatched_records_count": sent_count}

@router.get("/preferences", response_model=List[NotificationPreferenceResponse])
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user notification channel preferences.
    
    Lists disabled/enabled flags for In-App, Email, SMS, or Push notifications.
    """
    service = NotificationService(db)
    return service.get_preferences(current_user.id)

@router.patch("/preferences", response_model=List[NotificationPreferenceResponse])
def update_my_preferences(
    req: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update own notification channels.
    
    Modifies custom preferences mapping for notification dispatch settings.
    """
    service = NotificationService(db)
    return service.update_preferences(current_user.id, req)
