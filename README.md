# MemoryMesh

> **Stateful agent memory architecture** — Multi-Tenant Conversational AI with 3-layer persistent memory.

---

## Architecture Deep Dive

MemoryMesh solves the "context window problem" for long-running AI agents by utilizing a **3-Layer Stateful Memory Architecture**. Instead of naively sending the entire conversation history to the LLM (which is slow and extremely expensive), or randomly chunking vectors (which loses conversational flow), MemoryMesh intelligently stages context.

```text
                         MemoryMesh Memory Architecture
                         ================================

  User Message
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │                     MemoryManager                        │
  │                                                          │
  │   Layer 1: Redis (Short-term Hot Cache)                  │
  │   ┌─────────────────────────────────────────┐           │
  │   │  Purpose: Instant conversational flow    │           │
  │   │  Storage: Last 20 messages (JSON)        │           │
  │   │  Speed: < 2ms latency                    │           │
  │   └─────────────────────────────────────────┘           │
  │                         │                                │
  │   Layer 2: PostgreSQL + pgvector (Semantic Recall)       │
  │   ┌─────────────────────────────────────────┐           │
  │   │  Purpose: Long-term topical recall       │           │
  │   │  Storage: Top-5 semantically relevant    │           │
  │   │  Method: Cosine similarity on embeddings │           │
  │   └─────────────────────────────────────────┘           │
  │                         │                                │
  │   Layer 3: Memory Compression (Claude Haiku)             │
  │   ┌─────────────────────────────────────────┐           │
  │   │  Purpose: Mitigate token bloat           │           │
  │   │  Trigger: conversation > 4000 tokens     │           │
  │   │  Action: Summarise oldest 50% of history │           │
  │   └─────────────────────────────────────────┘           │
  └─────────────────────────────────────────────────────────┘
       │
       ▼
  [ Summary + Top 5 Semantic + Last 20 Recent + User Msg ]
       │
       ▼
  FastAPI Server-Sent Events (SSE) Stream -> React Frontend
```

### The 3 Layers Explained

1. **Layer 1: Redis Hot Cache**
   Every time a user sends a message, the last 20 messages of the conversation are pulled from a Redis cache. This provides the LLM with the immediate, exact back-and-forth context of what is currently being discussed, without needing to hit the primary disk database.
2. **Layer 2: pgvector Semantic Recall**
   The incoming user message is passed to `text-embedding-3-small` (via OpenAI) to generate an embedding. MemoryMesh runs a `pgvector` cosine similarity search across *all* past messages in the database. The top 5 most conceptually relevant past messages (e.g., something discussed 3 weeks ago) are injected into the prompt.
3. **Layer 3: Asynchronous Compression**
   Once a conversation crosses 4,000 total tokens, the backend triggers an asynchronous task. It takes the oldest 50% of the conversation and asks `claude-haiku-20240307` (via LangChain ChatAnthropic) to generate a dense, factual summary. The original older messages are permanently deleted to save space, and the summary is prepended to the system prompt moving forward.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + LangChain |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 (AOF persistence) |
| AI Chat | Anthropic Claude API (`claude-sonnet-4-20250514`) via LangChain |
| AI Compression | Anthropic Claude API (`claude-haiku-20240307`) via LangChain |
| Embeddings | OpenAI `text-embedding-3-small` via LangChain |
| Frontend | React 18 + TypeScript + Vite |
| Infrastructure | Docker Compose |

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/roshanvrazak/memorymesh
cd memorymesh
cp .env.example .env
# Add your ANTHROPIC_API_KEY and OPENAI_API_KEY to .env
```

### 2. Start all services

```bash
docker compose up --build
```

### 3. Verify

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

Frontend: http://localhost:3000

---

## API Reference

### Health check

```bash
curl http://localhost:8000/health
```

### Create a tenant

```bash
curl -X POST http://localhost:8000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'
# Returns: {"id": "<tenant-id>", "name": "Acme Corp", "created_at": "..."}
```

### Create a user

```bash
curl -X POST http://localhost:8000/api/tenants/<tenant-id>/users \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
# Returns: {"id": "<user-id>", "tenant_id": "<tenant-id>", "username": "alice", ...}
```

### Send a chat message (streaming SSE)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>" \
  -d '{"message": "What is the capital of France?"}' \
  --no-buffer
# Streams: data: {"type":"token","content":"Paris"} ...
```

### Continue an existing conversation

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>" \
  -d '{"message": "Tell me more.", "conversation_id": "<conv-id>"}'
```

### List conversations

```bash
curl http://localhost:8000/api/conversations \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>"
```

### Get a conversation with full history

```bash
curl http://localhost:8000/api/conversations/<conv-id> \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>"
```

### Memory debug — see what each layer holds

```bash
curl http://localhost:8000/api/conversations/<conv-id>/memory-debug \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>"
# Returns: {"redis_hit": true, "redis_messages": 8, "semantic_messages": 3, "summary_active": false, ...}
```

### Delete a conversation

```bash
curl -X DELETE http://localhost:8000/api/conversations/<conv-id> \
  -H "X-Tenant-ID: <tenant-id>" \
  -H "X-User-ID: <user-id>"
```

---

## How Memory Compression Works

When a conversation exceeds **4,000 tokens**:

1. The oldest 50% of messages are selected
2. `claude-haiku-20240307` (via LangChain `ChatAnthropic`) generates a concise factual summary
3. The summary is stored in `conversations.summary`
4. The original compressed messages are **deleted** from the database
5. The Redis cache is invalidated so the next request re-hydrates from the updated database
6. Future context assembly injects the summary at the top of the system prompt

This approach dramatically reduces token costs while preserving all important context.

---

## Multi-Tenancy

Every database query is scoped by `tenant_id`. All tables include a `tenant_id` foreign key:

- `tenants` → root isolation boundary
- `users` → belong to one tenant
- `conversations` → scoped by both `user_id` and `tenant_id`
- `messages` → scoped by both `conversation_id` and `tenant_id`

No cross-tenant data leakage is possible at the query level.

---
