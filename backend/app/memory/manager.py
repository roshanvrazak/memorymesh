import uuid
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.memory.redis_layer import RedisMemoryLayer
from app.memory.pg_layer import PGMemoryLayer
from app.memory.compressor import MemoryCompressor
from app.models.db import Conversation, Message
from app.config import settings

redis_layer = RedisMemoryLayer()
pg_layer = PGMemoryLayer()
compressor = MemoryCompressor()


class MemoryManager:
    async def get_context(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
        current_query: str,
    ) -> Dict[str, Any]:
        """
        Returns context from all 3 memory layers:
        - recent_messages: from Redis (short-term cache)
        - semantic_context: from pgvector (semantic recall)
        - summary: from conversations.summary (compressed history)
        """
        tenant_str = str(tenant_id)
        conv_str = str(conversation_id)

        # Layer 1: Redis
        redis_hit = False
        recent_messages = await redis_layer.get_messages(tenant_str, conv_str)
        if recent_messages is None:
            # Cache miss — hydrate from PostgreSQL
            db_messages = await pg_layer.get_recent_messages(db, conversation_id, tenant_id)
            recent_messages = [
                {
                    "id": str(m.id),
                    "role": m.role.value if hasattr(m.role, "value") else m.role,
                    "content": m.content,
                    "token_count": m.token_count,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in db_messages
            ]
            await redis_layer.set_messages(tenant_str, conv_str, recent_messages)
        else:
            redis_hit = True

        # Layer 2: pgvector semantic search
        semantic_messages = await pg_layer.semantic_search(
            db, conversation_id, tenant_id, current_query, settings.SEMANTIC_TOP_K
        )
        semantic_context = [
            {
                "id": str(m.id),
                "role": m.role.value if hasattr(m.role, "value") else m.role,
                "content": m.content,
                "token_count": m.token_count,
            }
            for m in semantic_messages
        ]

        # Layer 3: Summary
        conv_result = await db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .where(Conversation.tenant_id == tenant_id)
        )
        conversation = conv_result.scalar_one_or_none()
        summary = conversation.summary if conversation else None

        return {
            "recent_messages": recent_messages,
            "semantic_context": semantic_context,
            "summary": summary,
            "debug": {
                "redis_hit": redis_hit,
                "redis_messages": len(recent_messages),
                "semantic_messages": len(semantic_context),
                "summary_active": summary is not None,
                "summary_tokens": len(summary) // 4 if summary else 0,
            },
        }

    async def save_message(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        tenant_id: uuid.UUID,
        role: str,
        content: str,
    ) -> Message:
        from app.memory.compressor import count_tokens

        # Generate embedding
        try:
            embedding = await pg_layer.get_embedding(content)
        except Exception:
            embedding = None

        token_count = count_tokens(content)

        from app.models.db import RoleEnum

        msg = Message(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            role=RoleEnum(role),
            content=content,
            embedding=embedding,
            token_count=token_count,
        )
        await pg_layer.store_message(db, msg)

        # Update Redis cache
        tenant_str = str(tenant_id)
        conv_str = str(conversation_id)
        await redis_layer.append_message(
            tenant_str,
            conv_str,
            {
                "id": str(msg.id),
                "role": role,
                "content": content,
                "token_count": token_count,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            },
        )

        # Check if compression needed
        should_compress = await compressor.should_compress(db, conversation_id, tenant_id)
        if should_compress:
            await compressor.compress(db, conversation_id, tenant_id)
            # Invalidate Redis cache after compression
            await redis_layer.delete_session(tenant_str, conv_str)

        return msg

    async def get_or_create_conversation(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> Conversation:
        if conversation_id:
            result = await db.execute(
                select(Conversation)
                .where(Conversation.id == conversation_id)
                .where(Conversation.tenant_id == tenant_id)
            )
            conv = result.scalar_one_or_none()
            if conv:
                return conv

        # Create new conversation
        conv = Conversation(
            user_id=user_id,
            tenant_id=tenant_id,
            title="New Conversation",
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv


memory_manager = MemoryManager()
