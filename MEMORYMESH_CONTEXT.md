# MemoryMesh — Claude Code Build Context

> Stateful multi-tenant conversational AI with 3-layer persistent memory architecture.
> Use **"MemoryMesh"** as the app name in README, Docker container names, package.json name field, and all UI headers.

---

## STACK

| Layer | Technology |
|---|---|
| Backend | FastAPI + LangChain |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| AI API | OpenRouter (openrouter.ai/api/v1) — OpenAI-compatible |
| Chat model | `anthropic/claude-sonnet-4` |
| Compression model | `anthropic/claude-haiku-4` |
| Frontend | React (Vite) + TypeScript |
| Infrastructure | Docker Compose |

---

## PROJECT STRUCTURE

```
memorymesh/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   │   └── db.py                  # SQLAlchemy models
│   │   ├── memory/
│   │   │   ├── manager.py             # MemoryManager orchestrator
│   │   │   ├── redis_layer.py         # Short-term session cache
│   │   │   ├── pg_layer.py            # pgvector semantic recall
│   │   │   └── compressor.py          # Haiku summarisation
│   │   ├── routers/
│   │   │   ├── chat.py
│   │   │   └── conversations.py
│   │   └── schemas/
│   │       └── chat.py
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MemoryDebugPanel.tsx   # Shows which memory layer was hit
│   │   │   └── TenantSwitcher.tsx
│   │   ├── hooks/
│   │   │   └── useChat.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── init-db/
│   └── 01-pgvector.sql                # Enable pgvector extension
├── .env.example
└── README.md
```

---

## DATABASE MODELS (SQLAlchemy — async)

Create these tables with **full multi-tenant isolation**. Every query MUST filter by `tenant_id`.

```
tenants      — id (UUID), name, api_key_hash, created_at
users        — id (UUID), tenant_id (FK), username, created_at
conversations— id (UUID), user_id (FK), tenant_id (FK), title, summary (TEXT), created_at, updated_at
messages     — id (UUID), conversation_id (FK), tenant_id (FK), role (enum: user/assistant),
               content (TEXT), embedding (Vector(1536)), token_count, created_at
```

---

## MEMORY ARCHITECTURE

This is the core feature. Implement a `MemoryManager` class with a 3-layer hierarchy:

### Layer 1 — Redis (short-term hot cache)
- Key pattern: `session:{tenant_id}:{conversation_id}`
- Store last 20 messages as JSON list
- TTL: 7200 seconds (2 hours)
- On cache miss: hydrate from PostgreSQL

### Layer 2 — PostgreSQL + pgvector (long-term semantic recall)
- Generate embeddings using `text-embedding-3-small` via OpenRouter or `sentence-transformers`
- On each new message: store embedding in `messages.embedding`
- Semantic search: cosine similarity, top 5 relevant past messages
- Always filter by `tenant_id` + `conversation_id`

### Layer 3 — Memory Compression (Claude Haiku via OpenRouter)
- Trigger: when conversation exceeds 4000 tokens
- Use `anthropic/claude-haiku-4` to summarise oldest 50% of messages into a single summary
- Store summary in `conversations.summary`
- Delete summarised messages from the `messages` table (keep summary + recent N messages only)
- This is the **cost-optimised memory compression** — key portfolio talking point

### MemoryManager interface

```python
async def get_context(tenant_id, conversation_id, current_query) -> dict:
    # Returns:
    # {
    #   "recent_messages": [...],       # from Redis
    #   "semantic_context": [...],      # from pgvector
    #   "summary": "..."                # from conversations.summary if compressed
    # }
```

---

## OPENROUTER CLIENT SETUP

Do **NOT** use the `anthropic` SDK. Use the `openai` SDK with a custom `base_url`:

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,  # https://openrouter.ai/api/v1
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "MemoryMesh",
    }
)
```

Use this same client for:
- Chat completions → model: `anthropic/claude-sonnet-4`
- Memory compression → model: `anthropic/claude-haiku-4`
- Streaming via `stream=True` on `client.chat.completions.create()`

---

## FASTAPI ENDPOINTS

```
POST   /api/chat                           Main chat — requires X-Tenant-ID + X-User-ID headers
GET    /api/conversations                  List conversations for user
GET    /api/conversations/{id}             Get conversation with full history
DELETE /api/conversations/{id}             Delete conversation + clear Redis cache
GET    /api/conversations/{id}/memory-debug  Return what each memory layer currently holds
POST   /api/tenants                        Create tenant (admin)
POST   /api/tenants/{id}/users             Create user within tenant
GET    /health                             Health check → {"status": "ok"}
```

### POST /api/chat behaviour
1. Validate `tenant_id` exists
2. Call `MemoryManager.get_context()`
3. Build LangChain prompt injecting all 3 context layers
4. Stream response back via **SSE (Server-Sent Events)**
5. Save user message + assistant response to PostgreSQL
6. Update Redis cache
7. Return memory debug metadata in response headers

---

## REACT FRONTEND

Dark-themed chat UI with:

- **Sidebar** — conversation list, create new, switch between conversations
- **ChatWindow** — streaming message support via SSE
- **MessageBubble** — shows timestamp + token count per message
- **TenantSwitcher** — dropdown top-right for demoing multi-tenancy
- **MemoryDebugPanel** — collapsible panel at bottom of screen showing:
  - 🟢 Green badge: `"Redis hit — 8 recent messages"`
  - 🟠 Orange badge: `"pgvector — 3 semantically relevant messages retrieved"`
  - 🟣 Purple badge: `"Summary active — 847 tokens compressed"`

The MemoryDebugPanel makes the invisible architecture visible — prioritise building this fully.

---

## DOCKER COMPOSE

Services:

| Service | Image | Port |
|---|---|---|
| postgres | `pgvector/pgvector:pg16` | 5432 |
| redis | `redis:7-alpine` (AOF persistence) | 6379 |
| backend | FastAPI | 8000 |
| frontend | Nginx serving Vite build | 3000 |

- Include healthchecks on all services
- PostgreSQL volume must be mounted for persistence
- Backend depends_on postgres + redis with healthy condition

---

## ENVIRONMENT VARIABLES (.env.example)

```env
# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
CHAT_MODEL=anthropic/claude-sonnet-4
COMPRESSION_MODEL=anthropic/claude-haiku-4

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/memorymesh

# Redis
REDIS_URL=redis://redis:6379

# App
ADMIN_API_KEY=
CORS_ORIGINS=http://localhost:3000
```

---

## TECHNICAL REQUIREMENTS

- Use **async SQLAlchemy** with `asyncpg` driver throughout
- Use **`redis.asyncio`** for async Redis client
- All FastAPI endpoints must be `async def`
- Include **Alembic migration** for initial schema
- `requirements.txt` must pin all versions
- PostgreSQL init script: `CREATE EXTENSION IF NOT EXISTS vector;`

---

## README.md MUST INCLUDE

- ASCII architecture diagram showing all 3 memory layers
- Docker Compose setup instructions (`docker compose up --build`)
- Explanation of how memory compression works
- Example `curl` commands for all endpoints
- Portfolio description: **"Stateful agent memory architecture"**

---

## VERIFICATION AFTER BUILD

```bash
docker compose up --build
curl http://localhost:8000/health
# Expected: {"status": "ok"}
```

---

## PORTFOLIO & CV CONTEXT

**GitHub repo name:** `memorymesh`

**CV bullet:**
> MemoryMesh — Multi-Tenant Conversational AI with Stateful Agent Memory Architecture.
> FastAPI · LangChain · PostgreSQL (pgvector) · Redis · React · OpenRouter.
> 3-layer memory hierarchy: Redis session cache, pgvector semantic recall, and cost-optimised compression via Claude Haiku. Multi-tenant isolation via row-level tenant_id scoping.

**Portfolio tagline:** *Not just chat — intelligent memory.*
