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
          background: open ? 'var(--bg-tertiary)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--border)' : 'var(--border-glass)',
          borderRadius: '10px',
          color: 'var(--text-primary)',
          padding: '8px 14px',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          fontWeight: 500,
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
        }}
        onMouseOver={e => {
          if (!open) e.currentTarget.style.background = 'var(--bg-secondary)';
        }}
        onMouseOut={e => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ color: 'var(--accent)' }}>⚡</span>
        <span>{currentTenant ? currentTenant.name : 'Connect Tenant'}</span>
        <span style={{
          color: 'var(--text-muted)',
          fontSize: '10px',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </button>

      {open && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          borderRadius: '16px',
          padding: '24px',
          width: '320px',
          zIndex: 100,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--border-glass)',
        }}>
          <div style={{
            fontWeight: 700,
            marginBottom: '16px',
            fontSize: '15px',
            color: 'var(--text-primary)',
            letterSpacing: '-0.2px'
          }}>
            Create Workspace
          </div>

          {currentTenant && currentUser && (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Active Tenant</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentTenant.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>User</div>
                <div style={{ color: 'var(--text-primary)' }}>{currentUser.username}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tenant name (e.g. Acme Corp)"
              style={inputStyle}
            />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your Username"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {error && <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginTop: '10px' }}>{error}</div>}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !username.trim()}
            className="btn-primary"
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '14px',
            }}
          >
            {loading ? 'Provisioning...' : 'Create & Switch'}
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
  borderRadius: '10px',
  color: 'var(--text-primary)',
  padding: '12px 14px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
}
