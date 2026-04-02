import pytest
import uuid
from app.memory.manager import MemoryManager
from app.models.db import Tenant, User, Conversation, Message, RoleEnum
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_get_context_redis_hit(db_session, mocker):
    # Mock Redis Layer
    mocker.patch("app.memory.manager.redis_layer.get_messages", new_callable=AsyncMock, return_value=[
        {"role": "user", "content": "Hello", "created_at": "2024-01-01T00:00:00"}
    ])
    mocker.patch("app.memory.manager.pg_layer.semantic_search", new_callable=AsyncMock, return_value=[])
    
    tenant_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    
    # Pre-create conversation to avoid query error in get_context
    conv = Conversation(id=conv_id, tenant_id=tenant_id, user_id=uuid.uuid4(), title="Test", summary="Brief summary")
    db_session.add(conv)
    await db_session.commit()
    
    mm = MemoryManager()
    context = await mm.get_context(db_session, tenant_id, conv_id, "hi")
    
    assert context["debug"]["redis_hit"] is True
    assert len(context["recent_messages"]) == 1
    assert context["summary"] == "Brief summary"

@pytest.mark.asyncio
async def test_save_message_triggers_compression(db_session, mocker):
    mocker.patch("app.memory.manager.pg_layer.get_embedding", new_callable=AsyncMock, return_value=[0.1]*1536)
    mocker.patch("app.memory.manager.pg_layer.store_message", new_callable=AsyncMock)
    mocker.patch("app.memory.manager.redis_layer.append_message", new_callable=AsyncMock)
    mocker.patch("app.memory.manager.redis_layer.delete_session", new_callable=AsyncMock)
    
    # Mock compressor to trigger and execute
    mock_compressor_should = mocker.patch("app.memory.manager.compressor.should_compress", new_callable=AsyncMock, return_value=True)
    mock_compressor_do = mocker.patch("app.memory.manager.compressor.compress", new_callable=AsyncMock)
    
    tenant_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    
    mm = MemoryManager()
    await mm.save_message(db_session, conv_id, tenant_id, "user", "Trigger compression")
    
    assert mock_compressor_should.called
    assert mock_compressor_do.called
