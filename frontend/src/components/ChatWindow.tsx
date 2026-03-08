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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isSetup = tenantId && userId

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '16px',
        paddingBottom: '8px',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            gap: '8px',
          }}>
            <div style={{ fontSize: '40px' }}>🧠</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>MemoryMesh</div>
            <div style={{ fontSize: '14px' }}>
              {isSetup ? 'Start a conversation — your memory persists.' : 'Create a tenant to get started →'}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {error && (
          <div style={{
            margin: '8px 16px',
            padding: '10px',
            background: '#f8514922',
            border: '1px solid #f8514944',
            borderRadius: '8px',
            color: '#f85149',
            fontSize: '13px',
          }}>
            Error: {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Memory Debug Panel */}
      <MemoryDebugPanel debug={memoryDebug} />

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '8px 12px',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSetup ? 'Type a message... (Enter to send, Shift+Enter for newline)' : 'Set a tenant first'}
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
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!isSetup || isStreaming || !input.trim()}
            style={{
              background: isStreaming ? 'var(--border)' : 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: isStreaming ? 'var(--text-secondary)' : '#000',
              padding: '8px 16px',
              cursor: !isSetup || isStreaming ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
