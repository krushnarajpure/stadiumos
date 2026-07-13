import json
import logging
from app.core.config import settings
from typing import Any, Optional

logger = logging.getLogger("fastapi")

class RedisClient:
    def __init__(self):
        self.client = None
        try:
            import redis
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,
                socket_connect_timeout=2
            )
            # Test connection
            self.client.ping()
        except Exception as e:
            logger.warning(f"Redis connection failed. Running without cache: {str(e)}")
            self.client = None

    def set_cache(self, key: str, value: Any, ttl: int = 3600) -> None:
        if not self.client:
            return
        try:
            serialized_val = json.dumps(value)
            self.client.set(key, serialized_val, ex=ttl)
        except Exception:
            pass

    def get_cache(self, key: str) -> Optional[Any]:
        if not self.client:
            return None
        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass
        return None

    def delete_cache(self, key: str) -> None:
        if not self.client:
            return
        try:
            self.client.delete(key)
        except Exception:
            pass

# Singleton Instance
redis_client = RedisClient()
