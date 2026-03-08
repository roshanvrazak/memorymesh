import React, { useEffect, useState, useCallback } from 'react'
import { Conversation, listConversations, getConversation, deleteConversation, setTenantHeaders } from '../api/client'

interface Props {
  tenantId: string
  userId: string
  currentConversationId: string | null
  onSelect: (conversationId: string, messages: any[]) => void
  onNew: () => void
  refreshTrigger: number
}

function groupByDate(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

  const today: Conversation[] = []
  const yesterday: Conversation[] = []
  const thisWeek: Conversation[] = []
  const older: Conversation[] = []

  for (const c of conversations) {
    const d = new Date(c.updated_at)
    if (d >= todayStart) today.push(c)
    else if (d >= yesterdayStart) yesterday.push(c)
    else if (d >= weekStart) thisWeek.push(c)
    else older.push(c)
  }

  if (today.length) groups.push({ label: 'Today', items: today })
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday })
  if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek })
  if (older.length) groups.push({ label: 'Older', items: older })
  return groups
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

  const groups = groupByDate(conversations)
  const isEmpty = !loading && conversations.length === 0 && tenantId

  return (
    <div style={{
      width: '260px',
      minWidth: '260px',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(6, 6, 6, 0.5)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 5,
    }}>
      {/* New Chat button */}
      <div style={{ padding: '16px 14px 12px' }}>
        <button
          onClick={onNew}
          style={{
            width: '100%',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 'var(--r-md)',
            fontWeight: 700,
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
            letterSpacing: '0.1px',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,255,255,0.14)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
          New Chat
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border-glass)', margin: '0 14px' }} />

      {/* Conversations */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 8px 16px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Loading shimmer */}
        {loading && conversations.length === 0 && (
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[80, 60, 70].map((w, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 'var(--r-md)' }}>
                <div className="shimmer" style={{ height: '11px', width: `${w}%`, marginBottom: '6px' }} />
                <div className="shimmer" style={{ height: '9px', width: '45%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 16px', gap: '10px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                No conversations yet
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Start a chat to see your history here
              </div>
            </div>
          </div>
        )}

        {/* No tenant */}
        {!tenantId && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 16px', gap: '10px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                No workspace connected
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Use the button in the header to connect
              </div>
            </div>
          </div>
        )}

        {/* Grouped conversations */}
        {groups.map(group => (
          <div key={group.label}>
            <div style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              padding: '14px 12px 6px',
            }}>
              {group.label}
            </div>
            {group.items.map(conv => {
              const isActive = currentConversationId === conv.id
              const isHovered = hoveredId === conv.id

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="animate-fade-in"
                  style={{
                    padding: '9px 10px',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    background: isActive
                      ? 'var(--bg-tertiary)'
                      : (isHovered ? 'var(--bg-secondary)' : 'transparent'),
                    border: `1px solid ${isActive ? 'var(--border)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '2px',
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '18%', bottom: '18%',
                      width: '2px', background: 'var(--accent)',
                      borderRadius: '0 3px 3px 0', boxShadow: '0 0 8px var(--accent-glow)',
                    }} />
                  )}

                  <div style={{ flex: 1, overflow: 'hidden', paddingLeft: isActive ? '5px' : '2px', transition: 'padding 0.15s' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                    }}>
                      {conv.title || 'New Conversation'}
                    </div>
                    <div style={{
                      fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px',
                    }}>
                      {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <button
                    onClick={e => handleDelete(e, conv.id)}
                    title="Delete"
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      width: '22px', height: '22px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '6px', opacity: (isHovered || isActive) ? 1 : 0,
                      transition: 'all 0.15s', padding: 0,
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
                      e.currentTarget.style.color = 'var(--accent-red)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      {tenantId && (
        <div style={{
          padding: '10px 14px 14px',
          borderTop: '1px solid var(--border-glass)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '10px', color: 'var(--text-muted)',
          }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--accent-green)',
              boxShadow: '0 0 4px rgba(34,197,94,0.4)',
            }} />
            <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
