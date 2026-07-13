import re
import html
import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.redis_client import redis_client
from app.core.config import settings

logger = logging.getLogger("fastapi")

class SecurityLayer:
    @staticmethod
    def sanitize_input(val: str) -> str:
        # 1. Escape HTML syntax to prevent XSS payloads
        escaped = html.escape(val)
        
        # 2. SQL injection character stripping filters
        sanitized = re.sub(r"('|--|#|\/\*|\*\/)", "", escaped)
        
        # 3. Path Traversal protection (prevent directory hopping)
        sanitized = re.sub(r"(\.\./|\.\.\\)", "", sanitized)
        return sanitized

    @staticmethod
    def enforce_rate_limiting(ip: str, limit: int = 100, window_sec: int = 60) -> None:
        # Rate Limiting: Limit connection requests per client IP address
        redis_key = f"rate:limit:{ip}"
        count = redis_client.get_cache(redis_key)
        
        if count is None:
            redis_client.set_cache(redis_key, 1, ttl=window_sec)
            return

        if int(count) >= limit:
            logger.warning(f"Rate limiting threshold triggered for IP: {ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Try again later."
            )
            
        redis_client.set_cache(redis_key, int(count) + 1, ttl=window_sec)

    @staticmethod
    def verify_service_token(token: str) -> bool:
        # Enforce Zero-Trust service-to-service credentials validation
        expected = settings.SECRET_KEY
        return token == expected

# Global HTTP Security Headers Middleware
class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Enforce Rate Limiting prior to processing request body
        client_ip = request.client.host if request.client else "unknown"
        SecurityLayer.enforce_rate_limiting(client_ip)

        response = await call_next(request)
        
        # Inject standard security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        )
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
