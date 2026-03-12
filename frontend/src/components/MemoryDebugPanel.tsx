import React, { useState } from 'react'
import { MemoryDebug } from '../api/client'

interface Props {
  debug: MemoryDebug | null
}

export function MemoryDebugPanel({ debug }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  if (!debug) return null

  const layers = [
    {
      active: debug.redis_hit,
      color: '#22c55e',
      icon: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      label: 'Redis',
      detail: debug.redis_hit
        ? `Redis hit - ${debug.redis_messages} recent messages`
        : `${debug.redis_messages} messages - loaded from DB`,
    },
    {
      active: debug.semantic_messages > 0,
      color: '#f97316',
      icon: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.2"/>
          <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      ),
      label: 'pgvector',
      detail: debug.semantic_messages > 0
        ? `pgvector - ${debug.semantic_messages} semantically relevant messages retrieved`
        : 'no semantic matches',
    },
    {
      active: debug.summary_active,
      color: '#a855f7',
      icon: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 8h10M7 12h7M7 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      label: 'Summary',
      detail: debug.summary_active
        ? `Summary active - ${debug.summary_tokens ?? 0} tokens compressed`
        : 'no compression yet',
    },
  ]

  return (
    <div style={{
      borderTop: '1px solid var(--border-glass)',
      background: 'rgba(8,8,8,0.9)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontSize: '11px',
      transition: 'all 0.25s ease',
      flexShrink: 0,
    }}>
      {/* Header row */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 16px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', fontSize: '9px',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          Memory Layers
        </div>

        {/* Mini layer indicators */}
        {!collapsed && (
          <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
            {layers.map(l => (
              <div key={l.label} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: l.active ? l.color : 'var(--text-hint)',
                boxShadow: l.active ? `0 0 5px ${l.color}60` : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto', color: 'var(--text-hint)', fontSize: '8px' }}>
          {collapsed ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded panel */}
      {!collapsed && (
        <div className="animate-fade-in" style={{
          display: 'flex', gap: '8px', padding: '0 16px 10px',
          flexWrap: 'wrap',
        }}>
          {layers.map(layer => (
            <div key={layer.label} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px',
              borderRadius: '20px',
              background: layer.active ? `${layer.color}10` : 'var(--bg-secondary)',
              border: `1px solid ${layer.active ? layer.color + '30' : 'var(--border-subtle)'}`,
              transition: 'all 0.3s',
            }}>
              {/* Status dot */}
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: layer.active ? layer.color : 'var(--text-hint)',
                boxShadow: layer.active ? `0 0 6px ${layer.color}80` : 'none',
                flexShrink: 0,
              }} />

              {/* Icon */}
              <span style={{ color: layer.active ? layer.color : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {layer.icon}
              </span>

              {/* Label */}
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: layer.active ? layer.color : 'var(--text-muted)',
              }}>
                {layer.label}
              </span>

              {/* Detail */}
              <span style={{
                fontSize: '10px',
                color: layer.active ? `${layer.color}99` : 'var(--text-hint)',
                borderLeft: `1px solid ${layer.active ? layer.color + '30' : 'var(--border-subtle)'}`,
                paddingLeft: '7px',
                marginLeft: '1px',
              }}>
                {layer.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
