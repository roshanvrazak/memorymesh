import React, { useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatWindow } from './components/ChatWindow'
import { TenantSwitcher } from './components/TenantSwitcher'
import { TenantInfo, UserInfo, Message, setTenantHeaders, setAuthToken } from './api/client'
import { useChat } from './hooks/useChat'

export default function App() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)

  const tenantId = tenant?.id || ''
  const userId = user?.id || ''

  const { state, sendMessage, loadConversation, newConversation, togglePin, deleteMessage } = useChat(tenantId, userId, token)

  const handleTenantSwitch = (t: TenantInfo, u: UserInfo, tok: string | null = null) => {
    setTenant(t)
    setUser(u)
    setToken(tok)
    setTenantHeaders(t.id, u.id)
    setAuthToken(tok)
    newConversation()
    setSidebarRefresh(n => n + 1)
  }

  const handleSend = useCallback((content: string) => {
    sendMessage(content, state.conversationId || undefined)
    setTimeout(() => setSidebarRefresh(n => n + 1), 1000)
  }, [sendMessage, state.conversationId])

  const handleNew = () => newConversation()

  const handleSelectConversation = (conversationId: string, messages: Message[]) => {
    loadConversation(conversationId) // Simplified for now as useChat loadConversation is empty
  }

  const isConnected = Boolean(tenantId && userId)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: [
        'radial-gradient(ellipse 80% 60% at 70% -10%, rgba(0, 229, 255, 0.04), transparent)',
        'radial-gradient(ellipse 60% 60% at -10% 80%, rgba(168, 85, 247, 0.03), transparent)',
      ].join(', '),
    }}>
      {/* Header */}
      <header style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '10px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(8, 8, 8, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10,
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.9), rgba(168,85,247,0.9))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,229,255,0.2)',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(0,0,0,0.3)"/>
            <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
            Memory<span className="gradient-text">Mesh</span>
          </span>
          <span style={{
            fontSize: '10px',
            background: 'rgba(0,229,255,0.08)',
            color: 'var(--accent)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontWeight: 600,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}>
            3-Layer Memory
          </span>
        </div>

        {/* Status indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginLeft: '8px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: isConnected ? 'rgba(34,197,94,0.08)' : 'rgba(74,74,74,0.15)',
          border: `1px solid ${isConnected ? 'rgba(34,197,94,0.2)' : 'var(--border-subtle)'}`,
          transition: 'all 0.4s ease',
        }}>
          <div className={`status-dot ${isConnected ? '' : 'inactive'}`} />
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)',
            letterSpacing: '0.3px',
          }}>
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 10px',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: '#000',
                flexShrink: 0,
              }}>
                {user.username[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {user.username}
              </span>
            </div>
          )}
          <TenantSwitcher
            currentTenant={tenant}
            currentUser={user}
            onSwitch={handleTenantSwitch}
          />
        </div>
      </header>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          tenantId={tenantId}
          userId={userId}
          currentConversationId={state.conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNew}
          refreshTrigger={sidebarRefresh}
        />
        <ChatWindow
          messages={state.messages}
          isStreaming={state.isStreaming}
          memoryDebug={state.memoryDebug}
          onSend={handleSend}
          onPin={togglePin}
          onDelete={deleteMessage}
          error={state.error}
          tenantId={tenantId}
          userId={userId}
          token={token}
        />
      </div>
    </div>
  )
}
