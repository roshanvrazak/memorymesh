import { useState, useCallback, useRef } from 'react'
import { Message, MemoryDebug, setTenantHeaders } from '../api/client'

export interface ChatState {
  messages: Message[]
  conversationId: string | null
  isStreaming: boolean
  memoryDebug: MemoryDebug | null
  error: string | null
}

export function useChat(tenantId: string, userId: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    isStreaming: false,
    memoryDebug: null,
    error: null,
  })

  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    setTenantHeaders(tenantId, userId)

    // Optimistically add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isStreaming: true,
      error: null,
    }))

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId || state.conversationId || undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Read debug header
      const debugHeader = response.headers.get('X-Memory-Debug')
      if (debugHeader) {
        try {
          setState(prev => ({ ...prev, memoryDebug: JSON.parse(debugHeader) }))
        } catch { }
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let convId: string | null = null

      const assistantMsgId = crypto.randomUUID()
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        }]
      }))

      let buffer = ''

      let finalConvId = null;

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'conversation_id') {
                finalConvId = data.conversation_id;
                setState(prev => ({
                  ...prev,
                  conversationId: data.conversation_id,
                  memoryDebug: data.debug || prev.memoryDebug
                }))
              } else if (data.type === 'token') {
                assistantContent += data.content
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                  )
                }))
              } else if (data.type === 'done') {
                if (data.conversation_id) {
                  finalConvId = data.conversation_id;
                  setState(prev => ({
                    ...prev,
                    conversationId: data.conversation_id,
                    messages: prev.messages.map(m => {
                      if (m.id === assistantMsgId && data.assistant_token_count) {
                        return { ...m, token_count: data.assistant_token_count }
                      }
                      if (m.id === userMsg.id && data.user_token_count) {
                        return { ...m, token_count: data.user_token_count }
                      }
                      return m
                    }),
                  }))
                }
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        conversationId: finalConvId || prev.conversationId,
      }))
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: err.message || 'Failed to send message',
        }))
      }
    }
  }, [tenantId, userId, state.conversationId])

  const loadConversation = useCallback((conversationId: string, messages: Message[]) => {
    setState(prev => ({
      ...prev,
      conversationId,
      messages,
      memoryDebug: null,
      error: null,
    }))
  }, [])

  const newConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      isStreaming: false,
      memoryDebug: null,
      error: null,
    })
  }, [])

  return { state, sendMessage, loadConversation, newConversation }
}
