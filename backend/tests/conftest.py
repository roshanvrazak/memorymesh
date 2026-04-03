import pytest
import asyncio
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.db import Base
from app.config import settings

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    # Use SQLite in-memory for testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        # SQLite doesn't support pgvector, so we might need to mock Vector usage
        # or just ensure the schema is created without it if possible.
        # However, Base.metadata.create_all will try to create everything.
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        # Override dependency
        from app.main import app
        from app.database import get_db
        
        async def _get_test_db():
            yield session
            
        app.dependency_overrides[get_db] = _get_test_db
        
        yield session
        await session.rollback()
        await session.close()
        
        # Cleanup
        app.dependency_overrides.pop(get_db, None)
