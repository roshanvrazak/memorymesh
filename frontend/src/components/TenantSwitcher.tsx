import React, { useState, useRef, useEffect } from 'react'
import api, { createTenant, createUser, login, TenantInfo, UserInfo } from '../api/client'

interface Props {
  currentTenant: TenantInfo | null
  currentUser: UserInfo | null
  onSwitch: (tenant: TenantInfo, user: UserInfo, token: string | null) => void
}

export function TenantSwitcher({ currentTenant, currentUser, onSwitch }: Props) {
  const [open, setOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(false)
  const [name, setName] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAction = async () => {
    if (isLogin) {
      if (!tenantId.trim() || !username.trim() || !password.trim()) return
    } else {
      if (!name.trim() || !username.trim() || !password.trim()) return
    }
    
    setLoading(true)
    setError('')
    try {
      let t: TenantInfo
      let u: UserInfo
      let tok: string

      if (isLogin) {
        const res = await login(tenantId.trim(), username.trim(), password.trim())
        tok = res.access_token
        
        // Fetch actual user/tenant info
        const meRes = await api.get('/me', {
          headers: {
            'Authorization': `Bearer ${tok}`,
            'X-Tenant-ID': tenantId.trim()
          }
        })
        t = { id: meRes.data.tenant_id, name: meRes.data.tenant_name }
        u = { id: meRes.data.user_id, tenant_id: meRes.data.tenant_id, username: meRes.data.username }
      } else {
        const tenant = await createTenant(name.trim())
        const user = await createUser(tenant.id, username.trim(), password.trim())
        const res = await login(tenant.id, username.trim(), password.trim())
        t = tenant
        u = user
        tok = res.access_token
      }
      
      onSwitch(t, u, tok)
      setOpen(false)
      setName('')
      setTenantId('')
      setUsername('')
      setPassword('')
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const isConnected = Boolean(currentTenant && currentUser)

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'var(--bg-tertiary)' : (isConnected ? 'rgba(0,229,255,0.06)' : 'transparent'),
          border: `1px solid ${open ? 'var(--border)' : (isConnected ? 'rgba(0,229,255,0.2)' : 'var(--border-glass)')}`,
          borderRadius: 'var(--r-md)',
          color: 'var(--text-primary)',
          padding: '7px 12px',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          fontWeight: 500,
          alignItems: 'center',
          gap: '7px',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke={isConnected ? 'var(--accent)' : 'var(--text-muted)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            fill={isConnected ? 'rgba(0,229,255,0.1)' : 'none'}
          />
        </svg>
        <span>{currentTenant ? currentTenant.name : 'Connect Workspace'}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" style={{
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="animate-fade-in-scale" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          borderRadius: 'var(--r-xl)',
          padding: '20px',
          width: '300px',
          zIndex: 100,
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          {currentTenant && currentUser && (
            <div style={{
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.12)',
              borderRadius: 'var(--r-md)',
              padding: '12px',
              marginBottom: '18px',
            }}>
              <div style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px',
                textTransform: 'uppercase', color: 'var(--accent)',
                marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--accent-green)', boxShadow: '0 0 4px rgba(34,197,94,0.5)',
                }} />
                Active Workspace
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1px' }}>
                    {currentTenant.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    @{currentUser.username}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                background: !isLogin ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: !isLogin ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${!isLogin ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
                cursor: 'pointer'
              }}
            >
              Provision
            </button>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                background: isLogin ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: isLogin ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${isLogin ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!isLogin ? (
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                  WORKSPACE NAME
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="input-field"
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                  WORKSPACE ID
                </label>
                <input
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  placeholder="UUID"
                  className="input-field"
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                USERNAME
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="input-field"
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                onKeyDown={e => e.key === 'Enter' && handleAction()}
              />
            </div>
          </div>

          {error && (
            <div style={{
              color: 'var(--accent-red)', fontSize: '12px', marginTop: '10px',
              padding: '8px 10px', background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--r-md)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={loading || (isLogin ? (!tenantId || !username || !password) : (!name || !username || !password))}
            className="btn-primary"
            style={{ marginTop: '14px', width: '100%', padding: '11px' }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create & Connect')}
          </button>
        </div>
      )}
    </div>
  )
}
