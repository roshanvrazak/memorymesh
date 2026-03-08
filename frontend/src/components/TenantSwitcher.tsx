import React, { useState, useRef, useEffect } from 'react'
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
      setError(e.message || 'Failed to create workspace')
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
        onMouseOver={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
        onMouseOut={e => {
          if (!open) {
            e.currentTarget.style.background = isConnected ? 'rgba(0,229,255,0.06)' : 'transparent'
            e.currentTarget.style.borderColor = isConnected ? 'rgba(0,229,255,0.2)' : 'var(--border-glass)'
          }
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
          {/* Active workspace */}
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
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#000',
                }}>
                  {currentTenant.name[0]?.toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {/* Create new */}
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
            marginBottom: '12px', letterSpacing: '0.3px',
          }}>
            {currentTenant ? 'Create new workspace' : 'Connect a workspace'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                WORKSPACE NAME
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="input-field"
                style={{ fontSize: '13px', padding: '9px 12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', display: 'block', marginBottom: '5px' }}>
                USERNAME
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="input-field"
                style={{ fontSize: '13px', padding: '9px 12px' }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>

          {error && (
            <div style={{
              color: 'var(--accent-red)', fontSize: '12px', marginTop: '10px',
              padding: '8px 10px', background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--r-md)',
              display: 'flex', gap: '6px', alignItems: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !username.trim()}
            className="btn-primary"
            style={{
              marginTop: '14px',
              width: '100%',
              padding: '11px',
              fontSize: '13px',
              letterSpacing: '0.2px',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Provisioning...
              </span>
            ) : 'Create & Connect'}
          </button>

          <div style={{
            fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px',
            lineHeight: 1.6, textAlign: 'center',
          }}>
            Each workspace is fully isolated with dedicated tenant data in PostgreSQL.
          </div>
        </div>
      )}
    </div>
  )
}
