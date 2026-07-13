from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.auth import User, Role
from app.models.user import UserProfile, EmergencyContact, AccessibilityPreference, UserActivityLog, UserAuditLog
from typing import List, Optional, Tuple

class ProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_profile(self, user_id: str) -> Optional[UserProfile]:
        return self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    def get_accessibility(self, user_id: str) -> Optional[AccessibilityPreference]:
        return self.db.query(AccessibilityPreference).filter(AccessibilityPreference.user_id == user_id).first()

    def get_emergency_contacts(self, user_id: str) -> List[EmergencyContact]:
        return self.db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()

    def get_user_activity(self, user_id: str, limit: int = 50) -> List[UserActivityLog]:
        return self.db.query(UserActivityLog)\
            .filter(UserActivityLog.user_id == user_id)\
            .order_by(UserActivityLog.created_at.desc())\
            .limit(limit).all()

    def create_profile(self, profile: UserProfile) -> UserProfile:
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def create_accessibility(self, accessibility: AccessibilityPreference) -> AccessibilityPreference:
        self.db.add(accessibility)
        self.db.commit()
        self.db.refresh(accessibility)
        return accessibility

    def create_emergency_contact(self, contact: EmergencyContact) -> EmergencyContact:
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def delete_emergency_contact(self, contact_id: str) -> None:
        contact = self.db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
        if contact:
            self.db.delete(contact)
            self.db.commit()

    def log_activity(self, log: UserActivityLog) -> UserActivityLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def log_audit(self, log: UserAuditLog) -> UserAuditLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    # Paginated, filtered, searched and sorted user directory listing
    def get_users_list(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[User], int]:
        query = self.db.query(User)

        # Apply searching
        if search:
            search_pattern = f"%{search}%"
            query = query.outerjoin(UserProfile).filter(
                or_(
                    User.email.ilike(search_pattern),
                    UserProfile.first_name.ilike(search_pattern),
                    UserProfile.last_name.ilike(search_pattern)
                )
            )

        # Apply filtering
        if role:
            query = query.join(User.roles).filter(Role.name == role)
        if status is not None:
            query = query.filter(User.is_active == status)

        # Count total records matching filters
        total = query.count()

        # Apply sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        results = query.offset(skip).limit(limit).all()
        return results, total
