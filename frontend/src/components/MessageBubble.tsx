import React from 'react'
import { Message } from '../api/client'

interface Props {
  message: Message
  isLatest?: boolean
}

export function MessageBubble({ message, isLatest }: Props) {
  const isUser = message.role === 'user'
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={isLatest ? "animate-fade-in" : ""} style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '24px',
      padding: '0 24px',
      position: 'relative',
    }}>
      {!isUser && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.05))',
          border: '1px solid rgba(0,229,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          flexShrink: 0,
          boxShadow: '0 4px 12px var(--accent-glow)',
        }}>
          <span style={{ fontSize: '16px' }}>🧠</span>
        </div>
      )}

      <div style={{
        maxWidth: isUser ? '70%' : '80%',
        background: isUser ? 'var(--user-bubble)' : 'var(--bg-tertiary)',
        border: '1px solid',
        borderColor: isUser ? 'var(--user-bubble-border)' : 'var(--border-glass)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '14px 18px',
        boxShadow: isUser ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        - webkitBackdropFilter: 'blur(10px)',
      }}>
      <div style={{
        fontSize: '15px',
        lineHeight: '1.7',
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        letterSpacing: '0.2px',
      }}>
        {message.content || (
          <span style={{ opacity: 0.5 }}>
            <span className="typing-dot">■</span>
          </span>
        )}
      </div>
      <div style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        marginTop: '10px',
        display: 'flex',
        gap: '12px',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        fontWeight: 500,
      }}>
        <span>{time}</span>
        {message.token_count && (
          <span style={{
            background: 'var(--bg-primary)',
            padding: '2px 6px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}>
            {message.token_count} tokens
          </span>
        )}
      </div>
    </div>
    </div >
  )
}
