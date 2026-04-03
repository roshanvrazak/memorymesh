import pytest
import uuid
import json
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth import create_access_token
from app.models.db import Tenant, User, Conversation
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_chat_sse_unauthorized(db_session, mocker):
    # Mock rate limiter to avoid Redis connection error
    mocker.patch("app.routers.chat.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    
    # Setup a tenant so we don't get 404 from get_current_tenant
    tenant_id = uuid.uuid4()
    tenant = Tenant(id=tenant_id, name="Test Tenant")
    db_session.add(tenant)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Provide valid UUIDs but NO Authorization header
        response = await ac.post(
            "/api/chat", 
            json={"message": "hi"}, 
            headers={
                "X-Tenant-ID": str(tenant_id)
            }
        )
    # get_current_user raises 401 if token is missing
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_chat_sse_success(db_session, mocker):
    # Mock rate limiter
    mocker.patch("app.routers.chat.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    
    # Mock LLM and MemoryManager
    # Instead of patching the instance, we patch the 'astream' method on the class 
    # OR we patch where it is used. Patching the instance attribute fails due to Pydantic.
    with patch("langchain_openai.chat_models.base.ChatOpenAI.astream", new_callable=AsyncMock) as mock_astream:
        mock_astream.return_value = AsyncMock()
        mocker.patch("app.routers.chat.memory_manager.get_or_create_conversation", new_callable=AsyncMock)
        mocker.patch("app.routers.chat.memory_manager.get_context", new_callable=AsyncMock, return_value={
            "recent_messages": [], "semantic_context": [], "summary": None, "debug": {}
        })
        mocker.patch("app.routers.chat.memory_manager.save_message", new_callable=AsyncMock)

        # Setup test data
        tenant_id = uuid.uuid4()
        user_id = uuid.uuid4()
        tenant = Tenant(id=tenant_id, name="Test Tenant")
        user = User(id=user_id, tenant_id=tenant_id, username="testuser")
        db_session.add_all([tenant, user])
        await db_session.commit()

        token = create_access_token(data={"sub": str(user_id), "tenant_id": str(tenant_id)})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/chat",
                json={"message": "hello"},
                headers={
                    "X-Tenant-ID": str(tenant_id),
                    "Authorization": f"Bearer {token}"
                }
            )
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
