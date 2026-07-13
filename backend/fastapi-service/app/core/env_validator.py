import sys
import logging

logger = logging.getLogger("fastapi")

def validate_environment():
    """
    Validates required environment variables on startup.
    Prevents the application from booting into a degraded or insecure state.
    """
    from app.core.config import settings
    environment = settings.STADIUMOS_ENV
    
    # 1. Validate Secrets in Production
    if environment == "production":
        secret_key = settings.SECRET_KEY
        if not secret_key or secret_key == "super-secret-key-development-value-change-me-in-production":
            logger.critical("CRITICAL ERROR: STADIUMOS_GATEWAY_JWT_SECRET is not configured or using unsafe fallback in PRODUCTION!")
            sys.exit(1)
            
        db_pass = settings.PG_PASS
        if not db_pass:
            logger.critical("CRITICAL ERROR: STADIUMOS_PG_PASS is not configured in PRODUCTION!")
            sys.exit(1)
            
    # 2. Validate Copilot Requirements
    llm_provider = (settings.COPILOT_LLM_PROVIDER or settings.LLM_PROVIDER or "gemini").lower()
    if llm_provider == "google" or llm_provider == "gemini":
        if not settings.GEMINI_API_KEY:
            logger.warning("WARNING: GEMINI_API_KEY is not set. The AI Copilot will fail to answer queries.")
    elif llm_provider == "openai":
        if not settings.OPENAI_API_KEY:
            logger.warning("WARNING: OPENAI_API_KEY is not set. The AI Copilot will fail to answer queries.")
            
    logger.info(f"Environment validation passed. Running in {environment} mode.")
