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
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
    } catch { }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (currentConversationId === id) onNew()
    } catch { }
  }

  return (
    <div className="glass-panel" style={{
      width: '280px',
      minWidth: '280px',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backdropFilter: 'blur(30px)',
      - webkitBackdropFilter: 'blur(30px)',
    background: 'rgba(5, 5, 5, 0.4)', /* darker transparent side */
      borderTop: 'none',
        borderBottom: 'none',
          borderLeft: 'none',
            zIndex: 5,
    }}>
      <div style={{ padding: '24px 16px 16px 16px' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            padding: '12px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(255, 255, 255, 0.1)';
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span> New Conversation
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0 12px 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Section title */}
        {conversations.length > 0 && (
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            padding: '8px 12px',
            marginTop: '8px',
          }}>
            History
          </div>
        )}

        {loading && conversations.length === 0 && (
          <div className="animate-pulse" style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px', textAlign: 'center' }}>
            Loading history...
          </div>
        )}
        
        {conversations.map(conv => {
          const isActive = currentConversationId === conv.id;
          const isHovered = hoveredId === conv.id;
          
          return (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="animate-fade-in"
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: isActive ? 'var(--bg-tertiary)' : (isHovered ? 'var(--bg-secondary)' : 'transparent'),
                border: '1px solid',
                borderColor: isActive ? 'var(--border)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active glow indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  bottom: '20%',
                  width: '3px',
                  background: 'var(--accent)',
                  borderRadius: '0 4px 4px 0',
                  boxShadow: '0 0 8px var(--accent-glow)'
                }} />
              )}
              
              <div style={{ flex: 1, overflow: 'hidden', paddingLeft: isActive ? '6px' : '0', transition: 'padding 0.15s ease' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {conv.title || 'New Conversation'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {new Date(conv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <button
                onClick={e => handleDelete(e, conv.id)}
                title="Delete conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  opacity: (isHovered || isActive) ? 1 : 0,
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 51, 102, 0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)';
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div >
  )
}
