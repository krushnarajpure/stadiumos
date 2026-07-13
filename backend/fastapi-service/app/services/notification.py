import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.notification import NotificationRepository
from app.repositories.user import UserRepository
from app.models.notification import Notification, NotificationPreference
from app.schemas.notification import NotificationCreate, NotificationBroadcast, NotificationPreferenceUpdate
from app.core.redis_client import redis_client
from app.core.kafka_client import kafka_client
from app.core.websocket import ws_manager
from app.core.fcm_client import fcm_client
from app.core.twilio_client import twilio_client
from app.core.sendgrid_client import sendgrid_client
from shared.utils.error_handlers import ValidationError
from typing import List, Optional, Any

logger = logging.getLogger("fastapi")

class NotificationService:
    def __init__(self, db: Session):
        self.repo = NotificationRepository(db)
        self.user_repo = UserRepository(db)

    def _is_duplicate_suppressed(self, user_id: str, message_hash: str) -> bool:
        # Prevent spam by suppressing identical messages sent to a user within 5 minutes
        redis_key = f"notify:spam:{user_id}:{message_hash}"
        cached = redis_client.get_cache(redis_key)
        if cached:
            return True
        redis_client.set_cache(redis_key, True, ttl=300)
        return False

    def _is_rate_limited(self, user_id: str) -> bool:
        # Restrict notification limits to 10 alerts per minute per user profile context
        redis_key = f"notify:limit:{user_id}"
        count = redis_client.get_cache(redis_key)
        if count is None:
            redis_client.set_cache(redis_key, 1, ttl=60)
            return False
            
        if int(count) >= 10:
            return True
            
        redis_client.set_cache(redis_key, int(count) + 1, ttl=60)
        return False

    def _format_with_template(self, type: str, message: str) -> str:
        # Maps localized templates based on types
        templates = {
            "Emergency": "🚨 EMERGENCY EVACUATION ALARM: {message}",
            "Crowd": "📊 CROWD CONGESTION ALERT: {message}",
            "Medical": "⚠️ MEDICAL INCIDENT NOTIFICATION: {message}",
            "Security": "🔒 SECURITY ANNOUNCEMENT: {message}",
            "AIRecommendation": "🤖 AI OPERATIONS SUGGESTION: {message}"
        }
        template = templates.get(type, "System Alert: {message}")
        return template.format(message=message)

    async def send_notification(self, notify_in: NotificationCreate) -> Notification:
        target_user = None
        if notify_in.user_id:
            target_user = self.user_repo.get_by_id(notify_in.user_id)
            if not target_user:
                raise ValidationError("Target user account profile not found")

            # Check duplicate suppression rules
            message_hash = str(hash(notify_in.message))
            if self._is_duplicate_suppressed(notify_in.user_id, message_hash):
                logger.warning(f"Notification suppressed as duplicate spam for user {notify_in.user_id}")
                raise ValidationError("Duplicate notification suppressed")

            # Check rate limiting boundaries
            if self._is_rate_limited(notify_in.user_id):
                logger.warning(f"Notification request blocked due to rate limits for user {notify_in.user_id}")
                raise ValidationError("User notification rate limit exceeded")

            # Check user channel preference authorizations
            prefs = self.repo.get_user_preferences(notify_in.user_id)
            disabled_channels = [p.channel for p in prefs if not p.is_enabled]
            if notify_in.channel in disabled_channels:
                logger.info(f"User {notify_in.user_id} has disabled notification channel: {notify_in.channel}")
                raise ValidationError("Target delivery channel is disabled by user preferences")

        formatted_msg = self._format_with_template(notify_in.type, notify_in.message)

        # Create record in Database
        db_notify = Notification(
            user_id=notify_in.user_id,
            title=notify_in.title,
            message=formatted_msg,
            type=notify_in.type,
            channel=notify_in.channel,
            priority=notify_in.priority,
            status="Pending"
        )
        self.repo.create_notification(db_notify)

        # Dispatch alert using the selected channel pipeline
        success = await self._dispatch_to_channel(db_notify, target_user)
        
        # Update status
        db_notify.status = "Sent" if success else "Failed"
        self.repo.update_notification(db_notify)

        # Emit Kafka Event logs
        kafka_client.publish_event(
            "stadiumos.notification.sent" if success else "stadiumos.notification.failed",
            key=db_notify.id,
            payload={
                "notification_id": db_notify.id,
                "user_id": db_notify.user_id,
                "channel": db_notify.channel,
                "priority": db_notify.priority,
                "status": db_notify.status
            }
        )

        return db_notify

    async def _dispatch_to_channel(self, notify: Notification, user: Optional[Any]) -> bool:
        try:
            if notify.channel == "WebSocket":
                # Broadcast via WebSockets
                if notify.user_id:
                    await ws_manager.broadcast_to_zone(notify.user_id, {"title": notify.title, "message": notify.message})
                else:
                    await ws_manager.broadcast_global({"title": notify.title, "message": notify.message})
                return True
                
            elif notify.channel == "Push":
                # Simulated push dispatch
                # In production: token = user.profile.device_token
                token = "mock-fcm-device-token"
                return fcm_client.send_push_notification(token, notify.title, notify.message)
                
            elif notify.channel == "SMS":
                if not user or not user.profile or not user.profile.phone_number:
                    logger.warning("Target user does not possess registered phone number coordinates")
                    return False
                return twilio_client.send_sms(user.profile.phone_number, notify.message)
                
            elif notify.channel == "Email":
                if not user or not user.email:
                    logger.warning("Target user missing active email index coordinates")
                    return False
                return sendgrid_client.send_email(user.email, notify.title, notify.message)
                
            else: # In-App notifications
                return True
        except Exception as e:
            logger.error(f"Error dispatching notification {notify.id} on channel {notify.channel}: {str(e)}")
            return False

    async def dispatch_role_broadcast(self, broadcast: NotificationBroadcast) -> int:
        # Fetch target users matching roles
        users = self.repo.get_users_by_roles(broadcast.roles)
        sent_count = 0

        for user in users:
            try:
                # Default role broadcasts to In-App channel paths
                notify_in = NotificationCreate(
                    user_id=user.id,
                    title=broadcast.title,
                    message=broadcast.message,
                    type=broadcast.type,
                    channel="In-App",
                    priority=broadcast.priority
                )
                await self.send_notification(notify_in)
                sent_count += 1
            except Exception:
                # Ignore individual user dispatch failures during global broadcasts
                continue

        # Publish BroadcastCompleted Kafka event logs
        kafka_client.publish_event(
            "stadiumos.notification.broadcast-completed",
            key=str(hash(broadcast.title)),
            payload={
                "title": broadcast.title,
                "sent_count": sent_count,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        return sent_count

    def update_preferences(self, user_id: str, req: NotificationPreferenceUpdate) -> List[NotificationPreference]:
        for pref in req.preferences:
            self.repo.update_preference(user_id, pref.channel, pref.is_enabled)
        return self.repo.get_user_preferences(user_id)

    def get_preferences(self, user_id: str) -> List[NotificationPreference]:
        return self.repo.get_user_preferences(user_id)

    def get_user_history(self, user_id: str, skip: int, limit: int):
        return self.repo.get_user_notifications(user_id, skip, limit)
