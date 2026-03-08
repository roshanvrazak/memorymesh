import React, { useEffect, useState, useCallback } from 'react'
import { Conversation, listConversations, getConversation, deleteConversation } from '../api/client'
import { setTenantHeaders } from '../api/client'

interface Props {
  tenantId: string
  userId: string
  currentConversationId: string | null
  onSelect: (conversationId: string, messages: any[]) => void
  onNew: () => void
  refreshTrigger: number
}

export function Sidebar({ tenantId, userId, currentConversationId, onSelect, onNew, refreshTrigger }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId || !userId) return
    setTenantHeaders(tenantId, userId)
    setLoading(true)
    try {
      const data = await listConversations()
      setConversations(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [tenantId, userId])

  useEffect(() => { load() }, [load, refreshTrigger])

  const handleSelect = async (id: string) => {
    try {
      const conv = await getConversation(id)
      onSelect(id, conv.messages || [])
    } catch {}
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (currentConversationId === id) onNew()
    } catch {}
  }

  return (
    <div style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ padding: '16px' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontWeight: 600,
            padding: '10px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          + New Conversation
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {loading && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px' }}>Loading...</div>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            style={{
              padding: '10px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: currentConversationId === conv.id ? 'var(--bg-tertiary)' : 'transparent',
              border: currentConversationId === conv.id ? '1px solid var(--border)' : '1px solid transparent',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {conv.title || 'New Conversation'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {new Date(conv.updated_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={e => handleDelete(e, conv.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 4px',
                borderRadius: '4px',
                opacity: 0,
                transition: 'opacity 0.1s',
              }}
              className="delete-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
