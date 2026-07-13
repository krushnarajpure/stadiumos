from sqlalchemy.orm import Session
from app.repositories.profile import ProfileRepository
from app.repositories.user import UserRepository
from app.models.user import UserProfile, AccessibilityPreference, EmergencyContact, UserActivityLog, UserAuditLog
from app.models.auth import User
from app.schemas.user import UserProfileUpdate, AccessibilityUpdate, EmergencyContactCreate
from shared.utils.error_handlers import ValidationError
from typing import List, Optional, Tuple

class ProfileService:
    def __init__(self, db: Session):
        self.repo = ProfileRepository(db)
        self.user_repo = UserRepository(db)

    def get_full_user(self, user_id: str) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValidationError("User account profile not found.")
        return user

    def update_profile(self, user_id: str, profile_in: UserProfileUpdate) -> UserProfile:
        profile = self.repo.get_profile(user_id)
        if not profile:
            profile = UserProfile(user_id=user_id)
            self.repo.create_profile(profile)

        profile.first_name = profile_in.first_name
        profile.last_name = profile_in.last_name
        profile.phone_number = profile_in.phone_number
        profile.address = profile_in.address
        
        self.user_repo.update()
        return profile

    def update_avatar_url(self, user_id: str, avatar_url: str) -> UserProfile:
        profile = self.repo.get_profile(user_id)
        if not profile:
            profile = UserProfile(user_id=user_id)
            self.repo.create_profile(profile)
        
        profile.avatar_url = avatar_url
        self.user_repo.update()
        return profile

    def update_accessibility(self, user_id: str, access_in: AccessibilityUpdate) -> AccessibilityPreference:
        access = self.repo.get_accessibility(user_id)
        if not access:
            access = AccessibilityPreference(user_id=user_id)
            self.repo.create_accessibility(access)

        access.requires_wheelchair = access_in.requires_wheelchair
        access.visual_assistance = access_in.requires_wheelchair
        access.audio_assistance = access_in.audio_assistance
        access.special_requirements = access_in.special_requirements

        self.user_repo.update()
        return access

    def add_emergency_contact(self, user_id: str, contact_in: EmergencyContactCreate) -> EmergencyContact:
        new_contact = EmergencyContact(
            user_id=user_id,
            contact_name=contact_in.contact_name,
            relationship=contact_in.relationship,
            phone_number=contact_in.phone_number
        )
        return self.repo.create_emergency_contact(new_contact)

    def delete_emergency_contact(self, user_id: str, contact_id: str) -> None:
        # Verify contact ownership before deleting
        contacts = self.repo.get_emergency_contacts(user_id)
        if not any(c.id == contact_id for c in contacts):
            raise ValidationError("Target emergency contact record not owned by current session user.")
        self.repo.delete_emergency_contact(contact_id)

    def assign_user_role(self, actor_id: str, target_id: str, role_name: str) -> User:
        target_user = self.user_repo.get_by_id(target_id)
        if not target_user:
            raise ValidationError("Target user profile not found.")

        target_role = self.user_repo.get_role_by_name(role_name)
        if not target_role:
            raise ValidationError(f"Target role '{role_name}' does not exist.")

        # Reassign roles list
        target_user.roles = [target_role]
        self.user_repo.update()

        # Audit Event Logging
        self.log_audit_event(
            actor_id=actor_id,
            action="ASSIGN_ROLE",
            target_id=target_id,
            changes={"role": role_name}
        )
        return target_user

    def change_user_status(self, actor_id: str, target_id: str, is_active: bool) -> User:
        target_user = self.user_repo.get_by_id(target_id)
        if not target_user:
            raise ValidationError("Target user profile not found.")

        target_user.is_active = is_active
        self.user_repo.update()

        # Audit Event Logging
        self.log_audit_event(
            actor_id=actor_id,
            action="STATUS_CHANGE",
            target_id=target_id,
            changes={"is_active": is_active}
        )
        return target_user

    def delete_user_account(self, target_id: str) -> None:
        user = self.user_repo.get_by_id(target_id)
        if user:
            # We enforce soft delete in compliance with auditing retention rules
            user.is_active = False
            self.user_repo.update()

    def get_activity_history(self, user_id: str) -> List[UserActivityLog]:
        return self.repo.get_user_activity(user_id)

    def log_user_action(self, user_id: str, action: str, ip: Optional[str] = None, ua: Optional[str] = None) -> None:
        log = UserActivityLog(
            user_id=user_id,
            action=action,
            ip_address=ip,
            user_agent=ua
        )
        self.repo.log_activity(log)

    def log_audit_event(self, actor_id: str, action: str, target_id: str, changes: dict) -> None:
        log = UserAuditLog(
            actor_id=actor_id,
            action=action,
            target_id=target_id,
            changes=changes
        )
        self.repo.log_audit(log)

    def list_users(
        self,
        skip: int,
        limit: int,
        search: Optional[str],
        role: Optional[str],
        status: Optional[bool],
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[User], int]:
        return self.repo.get_users_list(skip, limit, search, role, status, sort_by, sort_order)
