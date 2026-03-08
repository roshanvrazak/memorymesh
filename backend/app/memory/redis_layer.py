import json
import redis.asyncio as aioredis
from typing import List, Dict, Optional
from app.config import settings


class RedisMemoryLayer:
    def __init__(self):
        self.client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    def _key(self, tenant_id: str, conversation_id: str) -> str:
        return f"session:{tenant_id}:{conversation_id}"

    async def get_messages(self, tenant_id: str, conversation_id: str) -> Optional[List[Dict]]:
        key = self._key(tenant_id, conversation_id)
        data = await self.client.get(key)
        if data is None:
            return None
        return json.loads(data)

    async def set_messages(self, tenant_id: str, conversation_id: str, messages: List[Dict]):
        key = self._key(tenant_id, conversation_id)
        # Keep only last REDIS_MAX_MESSAGES
        messages = messages[-settings.REDIS_MAX_MESSAGES:]
        await self.client.setex(key, settings.REDIS_TTL, json.dumps(messages))

    async def append_message(self, tenant_id: str, conversation_id: str, message: Dict):
        existing = await self.get_messages(tenant_id, conversation_id) or []
        existing.append(message)
        await self.set_messages(tenant_id, conversation_id, existing)

    async def delete_session(self, tenant_id: str, conversation_id: str):
        key = self._key(tenant_id, conversation_id)
        await self.client.delete(key)

    async def ping(self) -> bool:
        try:
            await self.client.ping()
            return True
        except Exception:
            return False
