from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.repositories.user import UserRepository
from app.models.auth import User, RefreshToken, Role
from app.schemas.auth import UserCreate, LoginRequest, TokenResponse, ResetPasswordRequest
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token, create_reset_token
from app.core.config import settings
from shared.utils.error_handlers import ValidationError, AuthorizationError
import logging

logger = logging.getLogger("fastapi")

class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_user(self, user_in: UserCreate) -> User:
        existing_user = self.repo.get_by_email(user_in.email)
        if existing_user:
            raise ValidationError("User with this email already exists.")
        
        # Assign role based on account type
        role_name = "Operations Manager" if user_in.account_type == "operator" else "Fan"
        default_role = self.repo.get_role_by_name(role_name)
        if not default_role:
            default_role = Role(name=role_name, description=f"{role_name} access")
            self.repo.create_role(default_role)

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            email=user_in.email,
            password_hash=hashed_password,
            is_active=True,
            is_verified=False
        )
        new_user.roles.append(default_role)
        return self.repo.create(new_user)

    def authenticate_user(self, login_in: LoginRequest) -> TokenResponse:
        user = self.repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.password_hash):
            raise ValidationError("Invalid email or password.")
        
        if not user.is_active:
            raise AuthorizationError("User account is inactive.")

        user_roles = [r.name for r in user.roles]
        
        access_token = create_access_token(subject=user.id, roles=user_roles)
        refresh_token = create_refresh_token(subject=user.id)

        # Store Refresh Token in Database
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_refresh_token = RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=expires_at
        )
        self.repo.create_refresh_token(db_refresh_token)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    def refresh_access_token(self, refresh_token_str: str) -> TokenResponse:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise AuthorizationError("Invalid or expired refresh token.")
        
        db_token = self.repo.get_refresh_token(refresh_token_str)
        if not db_token or db_token.expires_at < datetime.utcnow() or db_token.revoked_at:
            raise AuthorizationError("Refresh token has been revoked or expired.")

        user = self.repo.get_by_id(db_token.user_id)
        if not user or not user.is_active:
            raise AuthorizationError("Inactive user profile reference.")

        user_roles = [r.name for r in user.roles]
        
        # Issue new token pair (refresh token rotation)
        new_access_token = create_access_token(subject=user.id, roles=user_roles)
        new_refresh_token = create_refresh_token(subject=user.id)

        # Revoke old refresh token, save new one
        self.repo.revoke_refresh_token(db_token)

        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_db_token = RefreshToken(
            token=new_refresh_token,
            user_id=user.id,
            expires_at=expires_at
        )
        self.repo.create_refresh_token(new_db_token)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    def revoke_token(self, refresh_token_str: str) -> None:
        db_token = self.repo.get_refresh_token(refresh_token_str)
        if db_token:
            self.repo.revoke_refresh_token(db_token)

    def generate_password_reset_token(self, email: str) -> str:
        user = self.repo.get_by_email(email)
        if not user:
            raise ValidationError("No account registered with this email address.")
        return create_reset_token(subject=user.id)

    def reset_user_password(self, req: ResetPasswordRequest) -> None:
        payload = decode_token(req.token)
        if not payload or payload.get("type") != "reset":
            raise ValidationError("Invalid or expired password reset token.")
        
        user_id = payload.get("sub")
        user = self.repo.get_by_id(user_id)
        if not user:
            raise ValidationError("User not found.")
            
        user.password_hash = get_password_hash(req.new_password)
        self.repo.db.commit()
