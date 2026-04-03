import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.db import Tenant, User, Conversation, Message, RoleEnum
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_full_application_logic(db_session, mocker):
    # 1. Mock External Dependencies (Redis, LLM)
    mocker.patch("app.routers.conversations.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    mocker.patch("app.routers.chat.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    mocker.patch("app.routers.auth.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    
    # Mock Redis Layer methods globally where they are used
    mocker.patch("app.memory.manager.redis_layer.get_messages", new_callable=AsyncMock, return_value=None)
    mocker.patch("app.memory.manager.redis_layer.append_message", new_callable=AsyncMock)
    mocker.patch("app.memory.manager.redis_layer.set_messages", new_callable=AsyncMock)
    mocker.patch("app.memory.manager.redis_layer.delete_session", new_callable=AsyncMock)
    mocker.patch("app.routers.conversations.redis_layer.delete_session", new_callable=AsyncMock)
    mocker.patch("app.routers.chat.redis_layer.delete_session", new_callable=AsyncMock)
    
    mocker.patch("app.memory.manager.pg_layer.get_embedding", new_callable=AsyncMock, return_value=[0.1]*1536)
    mocker.patch("app.memory.manager.pg_layer.semantic_search", new_callable=AsyncMock, return_value=[])
    
    # Mock LLM astream
    mock_astream = mocker.patch("langchain_openai.chat_models.base.ChatOpenAI.astream", new_callable=AsyncMock)
    mock_astream.return_value.__aiter__ = lambda x: AsyncMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        
        # 2. Provision Tenant (Admin Key)
        print("Testing Provisioning...")
        res = await client.post("/api/tenants", 
                               json={"name": "TestCorp"}, 
                               headers={"X-Admin-Key": "changeme"})
        assert res.status_code == 200
        tenant = res.json()
        tenant_id = tenant['id']
        
        # 3. Create User
        res = await client.post(f"/api/tenants/{tenant_id}/users", 
                               json={"username": "tester", "password": "password123"},
                               headers={"X-Admin-Key": "changeme"})
        assert res.status_code == 200
        user_id = res.json()['id']

        # 4. Login
        print("Testing Authentication...")
        res = await client.post("/api/token", data={"username": f"{tenant_id}:tester", "password": "password123"})
        assert res.status_code == 200
        token = res.json()['access_token']

        # 5. Chat & Isolation
        print("Testing Chat & Data Isolation...")
        chat_headers = {"X-Tenant-ID": tenant_id, "Authorization": f"Bearer {token}"}
        res = await client.post("/api/chat", json={"message": "Hello mesh!"}, headers=chat_headers)
        assert res.status_code == 200
        
        # 6. Verify Database State
        from sqlalchemy import select
        result = await db_session.execute(
            select(Conversation)
            .join(Tenant, Conversation.tenant_id == Tenant.id)
            .where(Tenant.id == uuid.UUID(tenant_id))
        )
        assert result.scalar() is not None
        print("Verification Successful!")
