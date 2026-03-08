import React from 'react'
import { Message } from '../api/client'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      padding: '0 16px',
    }}>
      <div style={{
        maxWidth: '72%',
        background: isUser ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
        border: '1px solid var(--border)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
      }}>
        <div style={{
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content || (
            <span style={{ opacity: 0.5 }}>
              <span className="typing-dot">▋</span>
            </span>
          )}
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          marginTop: '4px',
          display: 'flex',
          gap: '8px',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}>
          <span>{time}</span>
          {message.token_count && <span>{message.token_count} tokens</span>}
        </div>
      </div>
    </div>
  )
}
