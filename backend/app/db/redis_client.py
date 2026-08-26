import redis.asyncio as redis
from app.config import settings
from loguru import logger

class RedisClient:
    def __init__(self):
        self.redis = None

    async def init(self):
        if settings.redis_url == "memory":
            self.redis = {} # Mock
            logger.info("Using in-memory dict instead of Redis.")
        else:
            self.redis = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
            logger.info("Redis connected.")

    async def close(self):
        if self.redis and isinstance(self.redis, redis.Redis):
            await self.redis.close()

    async def cache_set(self, key: str, value: str, expire: int = 3600):
        if isinstance(self.redis, dict):
            self.redis[key] = value
        elif self.redis:
            await self.redis.set(key, value, ex=expire)

    async def cache_get(self, key: str) -> str:
        if isinstance(self.redis, dict):
            return self.redis.get(key)
        elif self.redis:
            return await self.redis.get(key)
        return None

    async def cache_delete(self, key: str):
        if isinstance(self.redis, dict):
            if key in self.redis:
                del self.redis[key]
        elif self.redis:
            await self.redis.delete(key)

redis_client = RedisClient()

async def init_redis():
    await redis_client.init()

async def close_redis():
    await redis_client.close()
