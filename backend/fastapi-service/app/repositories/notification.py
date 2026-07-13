from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationPreference
from app.models.auth import User, Role
from typing import List, Optional, Tuple

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_notification(self, id: str) -> Optional[Notification]:
        return self.db.query(Notification).filter(Notification.id == id).first()

    def create_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_user_notifications(self, user_id: str, skip: int = 0, limit: int = 50) -> Tuple[List[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        total = query.count()
        results = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        return results, total

    def delete_notification(self, notification: Notification) -> None:
        self.db.delete(notification)
        self.db.commit()

    def update_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    # Preferences specific actions
    def get_user_preferences(self, user_id: str) -> List[NotificationPreference]:
        return self.db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).all()

    def update_preference(self, user_id: str, channel: str, is_enabled: bool) -> NotificationPreference:
        pref = self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.channel == channel
        ).first()

        if not pref:
            pref = NotificationPreference(user_id=user_id, channel=channel)
            
        pref.is_enabled = is_enabled
        self.db.add(pref)
        self.db.commit()
        self.db.refresh(pref)
        return pref

    # Role targets for broadcasts
    def get_users_by_roles(self, roles: List[str]) -> List[User]:
        return self.db.query(User).join(User.roles).filter(Role.name.in_(roles)).all()
