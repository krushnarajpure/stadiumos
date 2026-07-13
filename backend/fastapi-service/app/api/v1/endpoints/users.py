from fastapi import APIRouter, Depends, Query, UploadFile, File, Response, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, PermissionChecker
from app.models.auth import User
from app.schemas.user import (
    UserProfileUpdate,
    AccessibilityUpdate,
    EmergencyContactCreate,
    EmergencyContactResponse,
    UserProfileFullResponse,
    UserStatusUpdate,
    UserRoleUpdate,
    UserActivityLogResponse
)
from app.services.profile import ProfileService
from typing import List, Optional

router = APIRouter()

# Enforce RBAC constraints: Admin and Operations Manager can list users
admin_or_ops = PermissionChecker(["Administrator", "Operations Manager"])

@router.get("/me", response_model=UserProfileFullResponse)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get own profile details.
    
    Returns the full user profile including accessibility preferences and roles.
    """
    service = ProfileService(db)
    return service.get_full_user(current_user.id)

@router.put("/me", response_model=UserProfileFullResponse)
def update_my_profile(
    profile_in: UserProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update own profile details.
    
    Edits personal profile information and logs the modification trace history.
    """
    service = ProfileService(db)
    service.update_profile(current_user.id, profile_in)
    service.log_user_action(
        user_id=current_user.id,
        action="UPDATE_PROFILE",
        ip=request.client.host if request.client else None,
        ua=request.headers.get("user-agent")
    )
    return service.get_full_user(current_user.id)

@router.put("/me/accessibility", response_model=UserProfileFullResponse)
def update_my_accessibility(
    access_in: AccessibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update own accessibility preferences.
    
    Modifies wheelchair assistance or custom navigation helper flags.
    """
    service = ProfileService(db)
    service.update_accessibility(current_user.id, access_in)
    return service.get_full_user(current_user.id)

@router.post("/me/emergency-contacts", response_model=EmergencyContactResponse)
def add_my_emergency_contact(
    contact_in: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a personal emergency contact.
    
    Links a new contact to receive alerts if safety escalations occur.
    """
    service = ProfileService(db)
    return service.add_emergency_contact(current_user.id, contact_in)

@router.delete("/me/emergency-contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_emergency_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a personal emergency contact.
    
    Deletes the link to the specified emergency contact.
    """
    service = ProfileService(db)
    service.delete_emergency_contact(current_user.id, contact_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/search", response_model=List[UserProfileFullResponse])
def search_users(
    skip: int = 0,
    limit: int = 20,
    q: Optional[str] = Query(None, description="Search query matching email, first or last name"),
    role: Optional[str] = Query(None, description="Filter by role name"),
    status: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_user: User = Depends(admin_or_ops),
    db: Session = Depends(get_db)
):
    """
    Search and list users.
    
    Enforces Administrator or Operations Manager role permissions to view the user registry.
    """
    service = ProfileService(db)
    users, _ = service.list_users(skip, limit, q, role, status, sort_by, sort_order)
    return users

@router.get("/activity", response_model=List[UserActivityLogResponse])
def get_my_activity(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get own audit activity logs.
    
    Returns historical operations logged by the session owner.
    """
    service = ProfileService(db)
    return service.get_activity_history(current_user.id)

@router.get("/{id}", response_model=UserProfileFullResponse)
def get_user_by_id(id: str, current_user: User = Depends(admin_or_ops), db: Session = Depends(get_db)):
    """
    Retrieve user by ID.
    
    Restricted to operations and administrative teams.
    """
    service = ProfileService(db)
    return service.get_full_user(id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: str, current_user: User = Depends(admin_or_ops), db: Session = Depends(get_db)):
    """
    Delete a user account.
    
    Removes user registration and revokes authorization access.
    """
    service = ProfileService(db)
    service.delete_user_account(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.patch("/{id}/status", response_model=UserProfileFullResponse)
def update_status(
    id: str,
    status_in: UserStatusUpdate,
    current_user: User = Depends(admin_or_ops),
    db: Session = Depends(get_db)
):
    """
    Update a user's active status.
    
    Allows toggle activation/deactivation flags of users.
    """
    service = ProfileService(db)
    service.change_user_status(current_user.id, id, status_in.is_active)
    return service.get_full_user(id)

@router.patch("/{id}/role", response_model=UserProfileFullResponse)
def update_role(
    id: str,
    role_in: UserRoleUpdate,
    current_user: User = Depends(admin_or_ops),
    db: Session = Depends(get_db)
):
    """
    Modify user authorization roles.
    
    Assigns role permissions to users (e.g. Operations Manager, Security Staff).
    """
    service = ProfileService(db)
    service.assign_user_role(current_user.id, id, role_in.role_name)
    return service.get_full_user(id)

@router.post("/profile-image", response_model=UserProfileFullResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload profile avatar image.
    
    Saves the user avatar file to storage buckets and updates their URL target.
    """
    # Mocking File Uploads to Object Storage (returning dynamic placeholder URL)
    mock_url = f"https://storage.googleapis.com/stadiumos-avatars/{current_user.id}_{file.filename}"
    service = ProfileService(db)
    service.update_avatar_url(current_user.id, mock_url)
    return service.get_full_user(current_user.id)
