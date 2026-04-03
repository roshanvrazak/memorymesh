import { useState, useCallback, useRef } from 'react'
import { Message, MemoryDebug, setTenantHeaders, pinMessage, deleteMessage as apiDeleteMessage } from '../api/client'

export interface ChatState {
  messages: Message[]
  conversationId: string | null
  isStreaming: boolean
  memoryDebug: MemoryDebug | null
  error: string | null
}

export function useChat(tenantId: string, userId: string, token: string | null = null) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    isStreaming: false,
    memoryDebug: null,
    error: null,
  })

  const abortRef = useRef<AbortController | null>(null)

  const loadConversation = useCallback(async (conversationId: string) => {
    // In a full implementation, we'd fetch messages here
    // For now, let's assume messages are loaded externally or state is managed simply
  }, [])

  const togglePin = useCallback(async (messageId: string) => {
    if (!state.conversationId) return
    try {
      const res = await pinMessage(state.conversationId, messageId)
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m => 
          m.id === messageId ? { ...m, is_pinned: res.is_pinned } : m
        )
      }))
    } catch (e: any) {
      console.error('Failed to pin message:', e)
    }
  }, [state.conversationId])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!state.conversationId) return
    try {
      await apiDeleteMessage(state.conversationId, messageId)
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== messageId)
      }))
    } catch (e: any) {
      console.error('Failed to delete message:', e)
    }
  }, [state.conversationId])

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    if (!content.trim()) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg, {
        id: 'temp-assistant',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }],
      isStreaming: true,
      error: null,
    }))

    abortRef.current = new AbortController()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId || state.conversationId || undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      // Handle debug header
      const debugHeader = response.headers.get('X-Memory-Debug')
      if (debugHeader) {
        try {
          setState(prev => ({ ...prev, memoryDebug: JSON.parse(atob(debugHeader)) }))
        } catch (e) {}
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'token') {
                assistantContent += data.content
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === 'temp-assistant' ? { ...m, content: assistantContent } : m
                  ),
                }))
              } else if (data.type === 'done') {
                setState(prev => ({
                  ...prev,
                  conversationId: data.conversation_id,
                  isStreaming: false,
                  messages: prev.messages.map(m =>
                    m.id === 'temp-assistant'
                      ? { ...m, id: crypto.randomUUID(), token_count: data.assistant_token_count }
                      : (m.id === userMsg.id ? { ...m, token_count: data.user_token_count } : m)
                  ),
                }))
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: e.message || 'Something went wrong',
        messages: prev.messages.filter(m => m.id !== 'temp-assistant'),
      }))
    }
  }, [tenantId, userId, token, state.conversationId])

  const newConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      isStreaming: false,
      memoryDebug: null,
      error: null,
    })
  }, [])

  return { state, sendMessage, loadConversation, newConversation, togglePin, deleteMessage }
}
