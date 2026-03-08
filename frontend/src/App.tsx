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
    }}>
      {/* Header */}
      <header style={{
        height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '20px' }}>🧠</span>
        <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>MemoryMesh</span>
        <span style={{
          fontSize: '11px',
          background: 'var(--accent)22',
          color: 'var(--accent)',
          border: '1px solid var(--accent)44',
          borderRadius: '8px',
          padding: '2px 8px',
        }}>
          3-layer memory
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
          error={state.error}
          tenantId={tenantId}
          userId={userId}
        />
      </div>
    </div>
  )
}
