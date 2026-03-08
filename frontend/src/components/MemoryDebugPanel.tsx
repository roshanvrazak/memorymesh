import React, { useState } from 'react'
import { MemoryDebug } from '../api/client'

interface Props {
  debug: MemoryDebug | null
}

export function MemoryDebugPanel({ debug }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  if (!debug) return null

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      padding: collapsed ? '8px 16px' : '12px 16px',
      fontSize: '12px',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: collapsed ? 0 : '8px',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px', fontSize: '11px', textTransform: 'uppercase' }}>
          Memory Debug
        </span>
        <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Badge
            color={debug.redis_hit ? '#3fb950' : '#6e7681'}
            label={debug.redis_hit
              ? `Redis hit — ${debug.redis_messages} recent messages`
              : `Redis miss — ${debug.redis_messages} messages loaded from DB`
            }
          />
          <Badge
            color={debug.semantic_messages > 0 ? '#d29922' : '#6e7681'}
            label={debug.semantic_messages > 0
              ? `pgvector — ${debug.semantic_messages} semantically relevant messages retrieved`
              : 'pgvector — no semantic matches'
            }
          />
          <Badge
            color={debug.summary_active ? '#bc8cff' : '#6e7681'}
            label={debug.summary_active
              ? `Summary active — ${debug.summary_tokens ?? 0} tokens compressed`
              : 'No summary (conversation not yet compressed)'
            }
          />
        </div>
      )}
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      background: color + '22',
      border: `1px solid ${color}44`,
      color,
      borderRadius: '12px',
      padding: '3px 10px',
      fontWeight: 500,
      fontSize: '12px',
    }}>
      {label}
    </span>
  )
}
