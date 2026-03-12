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
  const [inputFocused, setInputFocused] = useState(false)

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
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const isSetup = tenantId && userId
  const canSend = isSetup && !isStreaming && input.trim().length > 0

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '15%', left: '20%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', paddingTop: '28px', paddingBottom: '16px',
        zIndex: 1, display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 ? (
          <EmptyState isSetup={Boolean(isSetup)} />
        ) : (
          <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%', paddingBottom: '8px' }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} isLatest={idx === messages.length - 1} />
            ))}
            {error && <ErrorBanner message={error} />}
            <div ref={bottomRef} style={{ height: '8px' }} />
          </div>
        )}
        {messages.length > 0 && <div ref={bottomRef} />}
      </div>

      {/* Memory Debug Panel */}
      <MemoryDebugPanel debug={memoryDebug} />

      {/* Input area */}
      <div style={{
        padding: '12px 24px 20px',
        background: 'linear-gradient(to top, var(--bg-primary) 75%, transparent)',
        zIndex: 2,
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            borderRadius: 'var(--r-xl)',
            padding: '10px 12px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${inputFocused ? 'var(--border-active)' : 'var(--border-glass)'}`,
            boxShadow: inputFocused
              ? '0 0 0 3px var(--accent-glow), var(--shadow-lg)'
              : 'var(--shadow-md)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={isSetup ? 'Message MemoryMesh...' : 'Connect a tenant to begin →'}
              disabled={!isSetup || isStreaming}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.6',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                padding: '5px 6px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                background: canSend
                  ? 'linear-gradient(135deg, rgba(0,229,255,0.9), rgba(168,85,247,0.9))'
                  : 'var(--bg-elevated)',
                color: canSend ? '#000' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: canSend ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                marginBottom: '2px',
                boxShadow: canSend ? '0 2px 8px var(--accent-glow)' : 'none',
                fontFamily: 'inherit',
                letterSpacing: '0.2px',
              }}
            >
              {isStreaming ? (
                <>
                  <span className="typing-dot" style={{ fontSize: '12px' }}>■</span>
                  <span>Thinking</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Press <kbd style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
              }}>Enter</kbd> to send · <kbd style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '10px',
                fontFamily: 'inherit',
              }}>Shift+Enter</kbd> for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ isSetup }: { isSetup: boolean }) {
  return (
    <div className="animate-fade-in-scale" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      maxWidth: '780px',
      margin: '0 auto',
      width: '100%',
      gap: '0',
    }}>
      {/* Hero */}
      <div className="animate-float" style={{
        width: '60px', height: '60px', borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(168,85,247,0.12))',
        border: '1px solid rgba(0,229,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '22px',
        boxShadow: '0 8px 32px rgba(0,229,255,0.1)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="3" fill="var(--accent)" opacity="0.8"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: '26px', fontWeight: 700, letterSpacing: '-0.6px',
        marginBottom: '10px', textAlign: 'center',
      }}>
        Welcome to <span className="gradient-text">MemoryMesh</span>
      </h1>

      <p style={{
        fontSize: '14px', color: 'var(--text-secondary)',
        textAlign: 'center', lineHeight: 1.7, marginBottom: '36px',
        maxWidth: '460px',
      }}>
        {isSetup
          ? 'A multi-tenant AI that never forgets — powered by a 3-layer memory architecture that persists context across sessions.'
          : 'Connect a tenant workspace from the top-right corner to start a conversation.'}
      </p>

      {/* Architecture cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        width: '100%', marginBottom: '32px',
        opacity: isSetup ? 1 : 0.5, transition: 'opacity 0.4s ease',
      }}>
        <ArchCard
          color="var(--accent-green)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-green)" opacity="0.8"/>
            </svg>
          }
          layer="Layer 1"
          title="Redis Cache"
          subtitle="< 2ms · Hot storage"
          description="The last 20 messages are held in Redis with a 2-hour TTL. On cache miss, messages are hydrated from PostgreSQL instantly."
        />
        <ArchCard
          color="var(--accent)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="var(--accent)" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 8v6M8 11h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            </svg>
          }
          layer="Layer 2"
          title="pgvector Recall"
          subtitle="Top-5 semantic · cosine similarity"
          description="Every message is embedded with text-embedding-3-small. pgvector retrieves the 5 most contextually relevant past messages via cosine similarity."
        />
        <ArchCard
          color="var(--accent-purple)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--accent-purple)" strokeWidth="2"/>
              <path d="M7 8h10M7 12h7M7 16h5" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
            </svg>
          }
          layer="Layer 3"
          title="Haiku Compression"
          subtitle="> 4k tokens · async compress"
          description="When context exceeds 4,000 tokens, Claude Haiku asynchronously summarizes the oldest 50% of messages, slashing costs while preserving context."
        />
      </div>

      {/* Data flow diagram */}
      <div style={{
        width: '100%',
        background: 'rgba(12,12,12,0.6)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--r-xl)',
        padding: '20px 24px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
          color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Request Lifecycle
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          {[
            { label: 'User Message', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
            null,
            { label: 'Redis Check', color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.08)', detail: 'Layer 1' },
            null,
            { label: 'pgvector Query', color: 'var(--accent)', bg: 'rgba(0,229,255,0.08)', detail: 'Layer 2' },
            null,
            { label: 'Summary Fetch', color: 'var(--accent-purple)', bg: 'rgba(168,85,247,0.08)', detail: 'Layer 3' },
            null,
            { label: 'Claude Sonnet', color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.08)', detail: 'via SSE' },
          ].map((node, i) => {
            if (node === null) {
              return (
                <div key={i} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  width: '32px', justifyContent: 'center',
                }}>
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                    <path d="M0 6h20M16 2l4 4-4 4" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )
            }
            return (
              <div key={i} style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: node.bg,
                border: `1px solid ${node.color}22`,
                borderRadius: 'var(--r-md)',
                padding: '8px 12px',
                minWidth: '90px',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: node.color, textAlign: 'center', lineHeight: 1.3 }}>
                  {node.label}
                </span>
                {node.detail && (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.3px' }}>
                    {node.detail}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Tech stack row */}
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px',
          paddingTop: '14px', borderTop: '1px solid var(--border-glass)',
        }}>
          {[
            { tech: 'Redis 7', role: 'Hot cache' },
            { tech: 'PostgreSQL + pgvector', role: 'Vector store' },
            { tech: 'FastAPI', role: 'SSE streaming' },
            { tech: 'LangChain', role: 'Orchestration' },
            { tech: 'Anthropic Claude', role: 'LLM provider' },
          ].map(item => (
            <div key={item.tech} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px', padding: '3px 10px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.tech}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>· {item.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ArchCard({ color, icon, layer, title, subtitle, description }: {
  color: string; icon: React.ReactNode; layer: string;
  title: string; subtitle: string; description: string;
}) {
  return (
    <div className="arch-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          color, background: `${color}12`, border: `1px solid ${color}25`,
          borderRadius: '20px', padding: '2px 8px',
        }}>
          {layer}
        </span>
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
          {title}
        </div>
        <div style={{ fontSize: '10px', color, fontWeight: 500, letterSpacing: '0.2px' }}>
          {subtitle}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {description}
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="animate-fade-in" style={{
      margin: '12px 24px',
      padding: '14px 16px',
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 'var(--r-lg)',
      color: 'var(--accent-red)',
      fontSize: '13px',
      lineHeight: 1.6,
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13px' }}>Connection Error</strong>
        <span style={{ color: 'rgba(239,68,68,0.8)', fontSize: '12px' }}>{message}</span>
      </div>
    </div>
  )
}
