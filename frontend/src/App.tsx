import React, { useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatWindow } from './components/ChatWindow'
import { TenantSwitcher } from './components/TenantSwitcher'
import { TenantInfo, UserInfo, Message, setTenantHeaders } from './api/client'
import { useChat } from './hooks/useChat'

export default function App() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)

  const tenantId = tenant?.id || ''
  const userId = user?.id || ''

  const { state, sendMessage, loadConversation, newConversation } = useChat(tenantId, userId)

  const handleTenantSwitch = (t: TenantInfo, u: UserInfo) => {
    setTenant(t)
    setUser(u)
    setTenantHeaders(t.id, u.id)
    newConversation()
    setSidebarRefresh(n => n + 1)
  }

  const handleSend = useCallback((content: string) => {
    sendMessage(content, state.conversationId || undefined)
    // Refresh sidebar after sending to show new conversation
    setTimeout(() => setSidebarRefresh(n => n + 1), 1000)
  }, [sendMessage, state.conversationId])

  const handleNew = () => {
    newConversation()
  }

  const handleSelectConversation = (conversationId: string, messages: Message[]) => {
    loadConversation(conversationId, messages)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-primary)',
      /* subtle radial background for a premium feel */
      backgroundImage: 'radial-gradient(circle at top right, rgba(0, 229, 255, 0.05), transparent 400px), radial-gradient(circle at bottom left, rgba(185, 0, 255, 0.03), transparent 400px)',
    }}>
      {/* Header */}
      <header className="glass-panel" style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '12px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-glass)',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        zIndex: 10,
        position: 'relative',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-purple))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px var(--accent-glow)',
        }}>
          <span style={{ fontSize: '18px' }}>🧠</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>
          Memory<span className="gradient-text">Mesh</span>
        </span>
        <span style={{
          fontSize: '11px',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2px 10px',
          fontWeight: 500,
          marginLeft: '4px',
        }}>
          3-Layer Architecture
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {user.username}
            </span>
          )}
          <TenantSwitcher
            currentTenant={tenant}
            currentUser={user}
            onSwitch={handleTenantSwitch}
          />
        </div>
      </header>

      {/* Main Container */}
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
          error={state.error}
          tenantId={tenantId}
          userId={userId}
        />
      </div>
    </div>
  )
}
