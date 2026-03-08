import React from 'react'
import { Message } from '../api/client'

interface Props {
  message: Message
  isLatest?: boolean
}

function renderContent(content: string) {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n')
      const lang = lines[0].trim()
      const code = lines.slice(lang ? 1 : 0).join('\n').trim()
      return (
        <div key={i} style={{ margin: '10px 0' }}>
          {lang && (
            <div style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px',
              textTransform: 'uppercase', color: 'var(--accent)',
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderBottom: 'none', borderRadius: '6px 6px 0 0',
              padding: '4px 12px', display: 'inline-block',
            }}>
              {lang}
            </div>
          )}
          <pre style={{
            margin: 0, borderRadius: lang ? '0 6px 6px 6px' : 'var(--r-md)',
            fontSize: '12.5px',
          }}>
            <code>{code}</code>
          </pre>
        </div>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    // Process **bold** and line breaks
    return (
      <span key={i}>
        {part.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return <strong key={j} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{chunk.slice(2, -2)}</strong>
          }
          return chunk
        })}
      </span>
    )
  })
}

export function MessageBubble({ message, isLatest }: Props) {
  const isUser = message.role === 'user'
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={isLatest ? (isUser ? 'animate-slide-right' : 'animate-slide-left') : ''}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '20px',
        padding: '0 20px',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,229,255,0.12), rgba(168,85,247,0.12))',
          border: '1px solid rgba(0,229,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: '2px',
          boxShadow: '0 2px 8px rgba(0,229,255,0.08)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="3" fill="var(--accent)" opacity="0.7"/>
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: isUser ? '68%' : '78%',
        background: isUser
          ? 'var(--user-bubble)'
          : 'rgba(15,15,15,0.6)',
        border: '1px solid',
        borderColor: isUser ? 'var(--user-bubble-border)' : 'var(--border-glass)',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '12px 16px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isUser ? 'var(--shadow-sm)' : 'var(--shadow-md)',
      }}>
        {/* Content */}
        <div style={{
          fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', letterSpacing: '0.1px',
        }}>
          {message.content ? (
            renderContent(message.content)
          ) : (
            <span style={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="typing-dot">■</span>
              <span style={{ fontSize: '12px' }}>Thinking...</span>
            </span>
          )}
        </div>

        {/* Meta footer */}
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginTop: '8px',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {time}
          </span>
          {message.token_count ? (
            <span className="token-badge">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              {message.token_count} tokens
            </span>
          ) : null}
          {isUser && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-muted)' }}>
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: '2px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="var(--text-muted)" strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}
