import axios from 'axios'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  token_count?: number
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
  api.defaults.headers.common['X-User-ID'] = userId
}

export async function createTenant(name: string): Promise<TenantInfo> {
  const res = await api.post('/tenants', { name })
  return res.data
}

export async function createUser(tenantId: string, username: string): Promise<UserInfo> {
  const res = await api.post(`/tenants/${tenantId}/users`, { username })
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

export default api
