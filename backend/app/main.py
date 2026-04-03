from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.routers import chat, conversations, auth
from arq import create_pool
from arq.connections import RedisSettings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.arq_pool = await create_pool(
        RedisSettings(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    )
    yield
    await app.state.arq_pool.close()


app = FastAPI(
    title="MemoryMesh",
    description="Stateful multi-tenant conversational AI with 3-layer persistent memory architecture",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Memory-Debug", "X-Conversation-ID", "Authorization"],
)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(conversations.router, prefix="/api", tags=["conversations"])


@app.get("/health")
async def health():
    return {"status": "ok"}
