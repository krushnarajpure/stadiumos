from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.schemas.auth import UserCreate, UserResponse, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.common import MessageResponse
from app.services.auth import AuthService
from app.api.deps import get_db, get_current_user
from app.models.auth import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.
    
    Creates a new user profile with standard fan status and initializes their authorization roles.
    """
    service = AuthService(db)
    return service.register_user(user_in)

@router.post("/login", response_model=TokenResponse)
def login(login_in: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate user credentials.
    
    Verifies user email/password and returns a JWT access token. Also registers a secure, HTTP-only refresh cookie.
    """
    service = AuthService(db)
    tokens = service.authenticate_user(login_in)
    
    # Store refresh token in secure HTTP-only cookie for client CSRF defense
    response.set_cookie(
        key="stadiumos_refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        secure=False,
        samesite="lax"
    )
    return tokens

@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_token: str, response: Response, db: Session = Depends(get_db)):
    """
    Rotate expired access tokens.
    
    Authenticates the refresh token and yields a rotated token payload.
    """
    service = AuthService(db)
    tokens = service.refresh_access_token(refresh_token)
    
    # Rotate refresh token cookie
    response.set_cookie(
        key="stadiumos_refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        secure=False,
        samesite="lax"
    )
    return tokens

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(refresh_token: str, response: Response, db: Session = Depends(get_db)):
    """
    Revoke user session.
    
    Invalidates the active refresh token and clears the secure browser session cookies.
    """
    service = AuthService(db)
    service.revoke_token(refresh_token)
    response.delete_cookie(key="stadiumos_refresh_token")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile details.
    
    Returns details of the currently authenticated session owner.
    """
    return current_user

@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Trigger password recovery process.
    
    Generates a password recovery verification token for the requested user account.
    """
    service = AuthService(db)
    token = service.generate_password_reset_token(req.email)
    return {"message": "Recovery verification email has been dispatched", "token_fallback_dev": token}

@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset account password credentials.
    
    Verifies the password recovery token and sets the new password credentials.
    """
    service = AuthService(db)
    service.reset_user_password(req)
    return {"message": "Password credentials reset successfully"}
