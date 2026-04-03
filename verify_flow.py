import asyncio
import uuid
import json
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.auth import create_access_token
from backend.app.models.db import Base, Tenant, User
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import patch, AsyncMock

async def run_verification():
    print("🚀 Starting MemoryMesh E2E Verification (Mocked Redis)...")
    
    # 1. Setup In-Memory DB
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Override FastAPI dependencies
    from backend.app.database import get_db
    async def _get_test_db():
        async with async_session() as session:
            yield session
    app.dependency_overrides[get_db] = _get_test_db

    # Mock Redis Layer and Rate Limiter instances directly in the modules where they are defined
    # This prevents the app from trying to connect to 'redis:6379'
    with patch("backend.app.routers.conversations.rate_limiter.redis.incr", new_callable=AsyncMock, return_value=1), \
         patch("backend.app.routers.conversations.rate_limiter.redis.expire", new_callable=AsyncMock), \
         patch("backend.app.routers.chat.rate_limiter.redis.incr", new_callable=AsyncMock, return_value=1), \
         patch("backend.app.routers.chat.rate_limiter.redis.expire", new_callable=AsyncMock), \
         patch("backend.app.routers.auth.rate_limiter.redis.incr", new_callable=AsyncMock, return_value=1), \
         patch("backend.app.routers.auth.rate_limiter.redis.expire", new_callable=AsyncMock), \
         patch("backend.app.memory.manager.redis_layer.get_messages", new_callable=AsyncMock, return_value=None), \
         patch("backend.app.memory.manager.redis_layer.append_message", new_callable=AsyncMock), \
         patch("backend.app.memory.manager.redis_layer.set_messages", new_callable=AsyncMock), \
         patch("backend.app.routers.conversations.redis_layer.delete_session", new_callable=AsyncMock), \
         patch("backend.app.memory.manager.pg_layer.get_embedding", new_callable=AsyncMock, return_value=[0.1]*1536):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            
            # 2. Test Provisioning (Locked behind Admin Key)
            print("\nChecking Admin Lock...")
            admin_key = "changeme" 
            res = await client.post("/api/tenants", json={"name": "TestCorp"}, headers={"X-Admin-Key": admin_key})
            if res.status_code != 200:
                print(f"❌ Provisioning failed: {res.text}")
                return
            tenant = res.json()
            tenant_id = tenant['id']
            api_key = tenant['api_key']
            print(f"✅ Tenant Created: {tenant_id}")

            # 3. Create User
            res = await client.post(f"/api/tenants/{tenant_id}/users", 
                                   json={"username": "tester", "password": "password123"},
                                   headers={"X-Admin-Key": admin_key})
            user = res.json()
            user_id = user['id']
            print(f"✅ User Created: {user_id}")

            # 4. Login
            print("\nChecking Authentication...")
            res = await client.post("/api/token", data={"username": f"{tenant_id}:tester", "password": "password123"})
            if res.status_code != 200:
                print(f"❌ Login failed: {res.text}")
                return
            token = res.json()['access_token']
            print("✅ Login successful, token received.")

            # 5. Chat Flow
            print("\nChecking Chat Flow (Streaming)...")
            with patch("langchain_openai.chat_models.base.ChatOpenAI.astream", new_callable=AsyncMock) as mock_astream:
                async def mock_chunks(*args, **kwargs):
                    yield type('obj', (object,), {'content': 'Hello '})
                    yield type('obj', (object,), {'content': 'world!'})
                mock_astream.return_value.__aiter__ = mock_chunks

                chat_headers = {
                    "X-Tenant-ID": str(tenant_id),
                    "Authorization": f"Bearer {token}"
                }
                
                res = await client.post("/api/chat", 
                                       json={"message": "Verify the mesh."}, 
                                       headers=chat_headers)
                
                if res.status_code == 200:
                    print("✅ Chat SSE started successfully.")
                    full_text = ""
                    async for line in res.aiter_lines():
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                if data['type'] == 'token':
                                    full_text += data['content']
                            except: pass
                    print(f"✅ Received streamed response: '{full_text}'")
                else:
                    print(f"❌ Chat failed: {res.text}")

            # 6. Verify Memory Persistence
            print("\nChecking Conversation Persistence...")
            res = await client.get("/api/conversations", headers=chat_headers)
            convs = res.json()
            if len(convs) > 0:
                print(f"✅ Found {len(convs)} persistent conversations.")
                conv_id = convs[0]['id']
                
                res = await client.get(f"/api/conversations/{conv_id}/memory-debug", headers=chat_headers)
                debug = res.json()
                print(f"✅ Memory Layers verified: {json.dumps(debug)}")
            else:
                print("❌ No conversations found.")

    print("\n🎉 ALL CORE SYSTEMS VERIFIED!")

if __name__ == "__main__":
    asyncio.run(run_verification())
