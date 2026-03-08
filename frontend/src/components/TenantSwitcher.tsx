import React, { useState } from 'react'
import { createTenant, createUser, TenantInfo, UserInfo } from '../api/client'

interface Props {
  currentTenant: TenantInfo | null
  currentUser: UserInfo | null
  onSwitch: (tenant: TenantInfo, user: UserInfo) => void
}

export function TenantSwitcher({ currentTenant, currentUser, onSwitch }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !username.trim()) return
    setLoading(true)
    setError('')
    try {
      const tenant = await createTenant(name.trim())
      const user = await createUser(tenant.id, username.trim())
      onSwitch(tenant, user)
      setOpen(false)
      setName('')
      setUsername('')
    } catch (e: any) {
      setError(e.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>⚡</span>
        <span>{currentTenant ? currentTenant.name : 'Set Tenant'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
          width: '280px',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Create New Tenant</div>

          {currentTenant && currentUser && (
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 10px',
              marginBottom: '12px',
              fontSize: '12px',
            }}>
              <div style={{ color: 'var(--text-secondary)' }}>Current tenant</div>
              <div>{currentTenant.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>User: {currentUser.username}</div>
            </div>
          )}

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tenant name (e.g. Acme Corp)"
            style={inputStyle}
          />
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            style={{ ...inputStyle, marginTop: '8px' }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          {error && <div style={{ color: '#f85149', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !username.trim()}
            style={{
              marginTop: '12px',
              width: '100%',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              color: '#000',
              fontWeight: 600,
              padding: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '13px',
            }}
          >
            {loading ? 'Creating...' : 'Create & Switch'}
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '13px',
  outline: 'none',
}
