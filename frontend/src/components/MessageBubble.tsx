import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from '../api/client'

interface Props {
  message: Message
  isLatest?: boolean
  onPin?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MessageBubble({ message, isLatest, onPin, onDelete }: Props) {
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
        position: 'relative',
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
        borderColor: message.is_pinned ? 'var(--accent)' : (isUser ? 'var(--user-bubble-border)' : 'var(--border-glass)'),
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '12px 16px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: message.is_pinned ? '0 0 10px rgba(0,229,255,0.2)' : (isUser ? 'var(--shadow-sm)' : 'var(--shadow-md)'),
        position: 'relative',
      }}>
        {/* Pin indicator */}
        {message.is_pinned && (
          <div style={{
            position: 'absolute', top: '-8px', right: '10px',
            background: 'var(--bg-primary)', padding: '2px 6px',
            borderRadius: '4px', border: '1px solid var(--accent)',
            fontSize: '8px', color: 'var(--accent)', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '3px'
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
            PINNED
          </div>
        )}

        {/* Content */}
        <div className="prose" style={{
          fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', letterSpacing: '0.1px',
        }}>
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <span style={{ opacity: 0.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="typing-dot">■</span>
              <span style={{ fontSize: '12px' }}>Thinking...</span>
            </span>
          )}
        </div>

        {/* Meta footer & Actions */}
        <div style={{
          display: 'flex', gap: '12px', alignItems: 'center',
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
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: isUser ? '0' : '4px' }}>
            <button
              onClick={() => onPin?.(message.id)}
              title={message.is_pinned ? 'Unpin message' : 'Pin message'}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: message.is_pinned ? 'var(--accent)' : 'var(--text-hint)',
                display: 'flex', alignItems: 'center', transition: 'color 0.2s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={message.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete?.(message.id)}
              title="Delete message"
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--text-hint)',
                display: 'flex', alignItems: 'center', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>

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
