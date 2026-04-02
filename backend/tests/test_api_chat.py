import pytest
import uuid
import json
from httpx import AsyncClient
from app.main import app
from app.auth import create_access_token
from app.models.db import Tenant, User, Conversation

@pytest.mark.asyncio
async def test_chat_sse_unauthorized():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/chat", json={"message": "hi"}, headers={"X-Tenant-ID": str(uuid.uuid4())})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_chat_sse_success(db_session, mocker):
    # Mock LLM and MemoryManager
    mocker.patch("app.routers.chat.chat_chain.astream", return_value=AsyncMock())
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

    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/chat",
            json={"message": "hello"},
            headers={
                "X-Tenant-ID": str(tenant_id),
                "Authorization": f"Bearer {token}"
            }
        )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream"
