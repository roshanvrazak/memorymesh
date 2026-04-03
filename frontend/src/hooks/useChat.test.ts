import { renderHook, act } from '@testing-library/react'
import { useChat } from './useChat'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('useChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useChat('tenant-1', 'user-1'))
    expect(result.current.state.messages).toEqual([])
    expect(result.current.state.isStreaming).toBe(false)
  })

  it('sends message and updates state', async () => {
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'X-Memory-Debug': '{}' }),
      body: {
        getReader: () => {
          let done = false
          return {
            read: async () => {
              if (done) return { done: true, value: undefined }
              done = true
              return {
                done: false,
                value: new TextEncoder().encode('data: {"type": "token", "content": "hello"}\n\ndata: {"type": "done", "conversation_id": "conv-1"}\n\n')
              }
            }
          }
        }
      }
    }
    
    ;(globalThis.fetch as any).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useChat('tenant-1', 'user-1'))

    await act(async () => {
      await result.current.sendMessage('hi')
    })

    expect(result.current.state.messages.length).toBe(2)
    expect(result.current.state.messages[0].content).toBe('hi')
    expect(result.current.state.messages[1].content).toBe('hello')
  })
})
