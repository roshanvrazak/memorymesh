import time
from fastapi import HTTPException, status
from redis.asyncio import Redis

class RateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def check_rate_limit(self, tenant_id: str, limit: int = 60, window: int = 60):
        # key: ratelimit:<tenant_id>:<window_timestamp>
        current_window = int(time.time()) // window
        key = f"ratelimit:{tenant_id}:{current_window}"
        
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, window)
        
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {limit} requests per {window} seconds."
            )
