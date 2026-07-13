from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger("fastapi")

Base = declarative_base()

try:
    # Try PostgreSQL first
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=10
    )
    # Test connection immediately
    conn = engine.connect()
    conn.close()
except Exception as e:
    logger.warning(f"PostgreSQL connection failed. Falling back to SQLite: {str(e)}")
    engine = create_engine(
        "sqlite:///./stadiumos_dev.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
