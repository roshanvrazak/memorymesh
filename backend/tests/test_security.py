import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.db import Tenant, User

@pytest.mark.asyncio
async def test_tenant_api_key_required(db_session, mocker):
    # Mock rate limiter
    mocker.patch("app.routers.conversations.rate_limiter.check_rate_limit", new_callable=AsyncMock)
    
    tenant_id = uuid.uuid4()
    tenant = Tenant(id=tenant_id, name="Secure Tenant", api_key_hash="hashed_key")
    db_session.add(tenant)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Valid Tenant ID but NO API Key
        response = await ac.get(
            "/api/conversations",
            headers={"X-Tenant-ID": str(tenant_id)}
        )
    # Should be 401 because get_current_user is the primary dependency and it fails first
    assert response.status_code == 401
    assert "Not authenticated" in response.text

@pytest.mark.asyncio
async def test_admin_lock_on_provisioning():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Attempt to create tenant without admin key
        response = await ac.post(
            "/api/tenants",
            json={"name": "Attacker Tenant"}
        )
    assert response.status_code == 422 # Missing header

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Attempt with WRONG admin key
        response = await ac.post(
            "/api/tenants",
            json={"name": "Attacker Tenant"},
            headers={"X-Admin-Key": "wrong_key"}
        )
    assert response.status_code == 403
    assert "Invalid Admin API Key" in response.text

from unittest.mock import AsyncMock
