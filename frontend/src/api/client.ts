import axios from 'axios'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  token_count?: number
  is_pinned?: boolean
  created_at: string
}

export interface Conversation {
  id: string
  title?: string
  summary?: string
  created_at: string
  updated_at: string
  messages?: Message[]
}

export interface MemoryDebug {
  redis_hit: boolean
  redis_messages: number
  semantic_messages: number
  summary_active: boolean
  summary_tokens?: number
}

export interface TenantInfo {
  id: string
  name: string
}

export interface UserInfo {
  id: string
  tenant_id: string
  username: string
}

const api = axios.create({
  baseURL: '/api',
})

export function setTenantHeaders(tenantId: string, userId: string) {
  api.defaults.headers.common['X-Tenant-ID'] = tenantId
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null)
    }
    return Promise.reject(error)
  }
)

export async function createTenant(name: string): Promise<TenantInfo> {
  const res = await api.post('/tenants', { name })
  return res.data
}

export async function createUser(tenantId: string, username: string, password?: string): Promise<UserInfo> {
  const res = await api.post(`/tenants/${tenantId}/users`, { username, password })
  return res.data
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await api.get('/conversations')
  return res.data
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await api.get(`/conversations/${id}`)
  return res.data
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`)
}

export async function getMemoryDebug(conversationId: string): Promise<MemoryDebug> {
  const res = await api.get(`/conversations/${conversationId}/memory-debug`)
  return res.data
}

export async function login(tenantId: string, username: string, password: string): Promise<{ access_token: string, token_type: string }> {
  const params = new URLSearchParams()
  params.append('username', `${tenantId}:${username}`)
  params.append('password', password)
  const res = await api.post('/token', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  return res.data
}

export async function pinMessage(conversationId: string, messageId: string): Promise<{ id: string, is_pinned: boolean }> {
  const res = await api.post(`/conversations/${conversationId}/messages/${messageId}/pin`)
  return res.data
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  await api.delete(`/conversations/${conversationId}/messages/${messageId}`)
}

export default api
