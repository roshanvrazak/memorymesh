import React, { useRef, useEffect, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { MemoryDebugPanel } from './MemoryDebugPanel'
import { Message, MemoryDebug } from '../api/client'

interface Props {
  messages: Message[]
  isStreaming: boolean
  memoryDebug: MemoryDebug | null
  onSend: (content: string) => void
  error: string | null
  tenantId: string
  userId: string
}

export function ChatWindow({ messages, isStreaming, memoryDebug, onSend, error, tenantId, userId }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const isSetup = tenantId && userId

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.5,
      }} />

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '32px',
        paddingBottom: '24px',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div className="animate-fade-in" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(185,0,255,0.1))',
              border: '1px solid rgba(0,229,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 8px 32px var(--accent-glow)',
            }}>
              <span style={{ fontSize: '32px' }}>🧠</span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              marginBottom: '12px'
            }}>
              Welcome to <span className="gradient-text">MemoryMesh</span>
            </h1>

            <p style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              lineHeight: 1.6,
              marginBottom: '40px',
              maxWidth: '500px'
            }}>
              {isSetup ? 'Send a message to begin. Your conversation is preserved across sessions using a highly specific 3-layer architecture.' : 'Please create or select a Tenant from the top right to begin.'}
            </p>

            {/* Architecture Explanation Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              width: '100%',
              opacity: isSetup ? 1 : 0.5,
              transition: 'opacity 0.3s ease',
            }}>
              {/* Layer 1 */}
              <div className="glass-panel" style={{
                padding: '20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: 'var(--accent-green)', fontSize: '20px', marginBottom: '4px' }}>⚡</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Layer 1</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Redis Cache</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The most recent 20 messages are kept hot in memory for instant retrieval and zero-latency context assembly.
                </div>
              </div>

              {/* Layer 2 */}
              <div className="glass-panel" style={{
                padding: '20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: 'var(--accent)', fontSize: '20px', marginBottom: '4px' }}>🔍</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Layer 2</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>pgvector Recall</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Every message is embedded. We perform vector cosine similarity to inject the top 5 most relevant past thoughts into the prompt.
                </div>
              </div>

              {/* Layer 3 */}
              <div className="glass-panel" style={{
                padding: '20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ color: 'var(--accent-purple)', fontSize: '20px', marginBottom: '4px' }}>🗜️</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Layer 3</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Haiku Compression</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  When context exceeds 4k tokens, Claude Haiku summarizes older messages to permanently slash token costs.
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLatest={idx === messages.length - 1}
            />
          ))}
          {error && (
            <div className="animate-fade-in glass-panel" style={{
              margin: '16px auto',
              maxWidth: '800px',
              padding: '16px',
              background: 'rgba(255, 51, 102, 0.05)',
              border: '1px solid rgba(255, 51, 102, 0.2)',
              borderRadius: '12px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              lineHeight: 1.5,
            }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Connection Error</strong>
              {error}
            </div>
          )}
          <div ref={bottomRef} style={{ height: '24px' }} />
        </div>
      </div>

      {/* Memory Debug Panel */}
      <MemoryDebugPanel debug={memoryDebug} />

      {/* Input Area */}
      <div style={{
        padding: '24px',
        paddingTop: '0',
        background: 'linear-gradient(to top, var(--bg-primary) 80%, transparent)',
        zIndex: 2,
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          position: 'relative',
        }}>
          {/* Animated border container */}
          <div className="glass-panel" style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            borderRadius: '16px',
            padding: '10px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.4)';
              e.currentTarget.style.boxShadow = '0 8px 32px var(--accent-glow)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isSetup ? 'Message MemoryMesh...' : 'Set a tenant to begin...'}
              disabled={!isSetup || isStreaming}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '15px',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.5',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                padding: '4px 4px 4px 8px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!isSetup || isStreaming || !input.trim()}
              className="btn-primary"
              style={{
                background: (isStreaming || !input.trim()) ? 'var(--bg-tertiary)' : 'var(--text-primary)',
                color: (isStreaming || !input.trim()) ? 'var(--text-muted)' : 'var(--bg-primary)',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                marginBottom: '2px', // Align with textarea text bottom
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isStreaming ? <span className="typing-dot">■</span> : 'Send'}
            </button>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: '10px',
          }}>
            MemoryMesh can make mistakes. Consider verifying your architecture.
          </div>
        </div>
      </div>
    </div>
  )
}
