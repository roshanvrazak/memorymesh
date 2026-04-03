import React, { useRef, useEffect, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { MemoryDebugPanel } from './MemoryDebugPanel'
import { Message, MemoryDebug } from '../api/client'

interface Props {
  messages: Message[]
  isStreaming: boolean
  memoryDebug: MemoryDebug | null
  onSend: (content: string) => void
  onPin?: (id: string) => void
  onDelete?: (id: string) => void
  error: string | null
  tenantId: string
  userId: string
  token: string | null
}

export function ChatWindow({
  messages,
  isStreaming,
  memoryDebug,
  onSend,
  onPin,
  onDelete,
  error,
  tenantId,
  userId,
  token,
}: Props) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    onSend(input)
    setInput('')
  }

  const isConnected = Boolean(tenantId && userId)

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header Info */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border-glass)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,10,10,0.4)', backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
            boxShadow: isConnected ? '0 0 8px var(--accent-green)' : 'none',
          }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
            {isConnected ? 'NODE_ACTIVE' : 'DISCONNECTED'}
          </span>
        </div>
        
        {isConnected && (
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-hint)', fontWeight: 700 }}>TENANT_ID</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tenantId.slice(0,8)}...</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '20px 0',
          display: 'flex', flexDirection: 'column',
          scrollBehavior: 'smooth',
        }}
      >
        {!isConnected && (
          <div style={{
            margin: 'auto', textAlign: 'center', maxWidth: '300px',
            padding: '40px 20px', opacity: 0.8
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--accent)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>Initialize Mesh</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Connect to a tenant workspace to start a stateful persistent session.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isLatest={i === messages.length - 1}
            onPin={onPin}
            onDelete={onDelete}
          />
        ))}
        
        {error && <ErrorBanner message={error} />}
      </div>

      {/* Bottom Fixed Area */}
      <div style={{ flexShrink: 0 }}>
        {/* Memory Layers Debug */}
        <MemoryDebugPanel debug={memoryDebug} />

        {/* Input Form */}
        <div style={{
          padding: '20px', background: 'linear-gradient(to top, var(--bg-primary) 80%, transparent)',
        }}>
          <form
            onSubmit={handleSubmit}
            style={{
              maxWidth: '800px', margin: '0 auto', position: 'relative',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={!isConnected || isStreaming}
                placeholder={isConnected ? "Message AI agent..." : "Connect a workspace to chat"}
                className="input-field"
                style={{
                  paddingRight: '45px',
                  height: '48px',
                  fontSize: '14px',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                }}
              />
              <div style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', display: 'flex', gap: '8px',
                color: 'var(--text-hint)', fontSize: '10px', fontWeight: 600,
              }}>
                ⌘↵
              </div>
            </div>
            <button
              type="submit"
              disabled={!isConnected || !input.trim() || isStreaming}
              className="btn-primary"
              style={{
                width: '48px', height: '48px', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px', flexShrink: 0,
              }}
            >
              {isStreaming ? (
                <div className="typing-dot" style={{ margin: 0 }}>■</div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>
          <div style={{
            textAlign: 'center', marginTop: '10px', fontSize: '10px',
            color: 'var(--text-hint)', letterSpacing: '0.2px',
          }}>
            AI can make mistakes. Memory is persistent across sessions.
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      margin: '10px 20px', padding: '12px 16px',
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
    }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <div>
        <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13px' }}>Connection Error</strong>
        <span style={{ color: 'rgba(239,68,68,0.8)', fontSize: '12px' }}>{message}</span>
      </div>
    </div>
  )
}
