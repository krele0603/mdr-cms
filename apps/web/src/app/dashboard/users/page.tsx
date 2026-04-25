'use client'
import { useState, useEffect } from 'react'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-types'
import type { UserRole } from '@/lib/auth-types'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  created_at: string
}

const ROLES: UserRole[] = ['admin', 'consultant', 'client']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [filterRole, setFilterRole] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'consultant' as UserRole, password: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      // API returns array directly
      setUsers(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  function openCreate() {
    setEditUser(null)
    setForm({ name: '', email: '', role: 'consultant', password: '' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setForm({ name: user.name, email: user.email, role: user.role, password: '' })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!editUser && !form.email.trim()) { setFormError('Email is required'); return }
    if (!editUser && !form.password) { setFormError('Password is required'); return }
    if (!editUser && form.password.length < 8) { setFormError('Password must be at least 8 characters'); return }

    setSaving(true)
    try {
      let res
      if (editUser) {
        res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          }),
        })
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to save'); setSaving(false); return }
      setShowModal(false)
      loadUsers()
    } catch {
      setFormError('Connection error')
    }
    setSaving(false)
  }

  async function toggleActive(user: User) {
    if (user.active && !confirm(`Deactivate ${user.name}? They will not be able to log in.`)) return
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    loadUsers()
  }

  const filtered = filterRole === '__inactive'
    ? users.filter(u => !u.active)
    : users.filter(u => !filterRole || u.role === filterRole)

  const counts = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    consultant: users.filter(u => u.role === 'consultant').length,
    client: users.filter(u => u.role === 'client').length,
    inactive: users.filter(u => !u.active).length,
  }

  const card = (label: string, val: number, f: string, color?: string) => (
    <div
      onClick={() => setFilterRole(f === filterRole ? '' : f)}
      style={{
        background: filterRole === f ? 'rgba(78,140,140,0.1)' : '#fff',
        border: filterRole === f ? '2px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.1)',
        borderRadius: 10, padding: '11px 14px', cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 12, color: '#5a6472', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || '#1a1f24' }}>{val}</div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>Users</h1>
          <p style={{ fontSize: 13, color: '#5a6472' }}>Manage system access and roles</p>
        </div>
        <button onClick={openCreate} style={{
          height: 32, padding: '0 14px', fontSize: 13,
          background: '#4e8c8c', border: 'none',
          borderRadius: 8, color: '#fff', cursor: 'pointer',
        }}>+ New user</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {card('All users', counts.total, '')}
        {card('Admins', counts.admin, 'admin', '#2e5f5f')}
        {card('Consultants', counts.consultant, 'consultant', '#7a5a10')}
        {card('Clients', counts.client, 'client', '#5a6472')}
        {card('Inactive', counts.inactive, '__inactive', '#943030')}
      </div>

      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a96a2', fontSize: 13 }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ee' }}>
                {['Name', 'Email', 'Role', 'Status', 'Created', ''].map(h => (
                  <th key={h} style={{
                    padding: '9px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 500, color: '#5a6472',
                    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const rc = ROLE_COLORS[u.role]
                return (
                  <tr key={u.id} style={{
                    borderBottom: i < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                    opacity: u.active ? 1 : 0.5,
                  }}>
                    <td style={{ padding: '11px 14px', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '11px 14px', color: '#5a6472' }}>{u.email}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: rc.bg, color: rc.color, border: `0.5px solid ${rc.border}`,
                      }}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: u.active ? 'rgba(58,122,90,0.12)' : '#f5f2ee',
                        color: u.active ? '#3a7a5a' : '#5a6472',
                        border: `0.5px solid ${u.active ? 'rgba(58,122,90,0.3)' : 'rgba(0,0,0,0.15)'}`,
                      }}>{u.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#8a96a2' }}>
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(u)} style={{
                          fontSize: 12, color: '#4e8c8c',
                          background: 'rgba(78,140,140,0.1)',
                          border: '0.5px solid rgba(78,140,140,0.3)',
                          borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                        }}>Edit</button>
                        <button onClick={() => toggleActive(u)} style={{
                          fontSize: 12,
                          color: u.active ? '#943030' : '#3a7a5a',
                          background: u.active ? 'rgba(148,48,48,0.08)' : 'rgba(58,122,90,0.08)',
                          border: `0.5px solid ${u.active ? 'rgba(148,48,48,0.25)' : 'rgba(58,122,90,0.25)'}`,
                          borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                        }}>{u.active ? 'Deactivate' : 'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#8a96a2', fontSize: 13 }}>
                  No users found.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 20,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
            border: '0.5px solid rgba(0,0,0,0.12)', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 500 }}>
                {editUser ? 'Edit user' : 'New user'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', fontSize: 18,
                cursor: 'pointer', color: '#5a6472', lineHeight: 1,
              }}>×</button>
            </div>

            <div style={{ padding: 20 }}>
              {formError && (
                <div style={{
                  background: 'rgba(148,48,48,0.08)', border: '0.5px solid rgba(148,48,48,0.3)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12,
                  color: '#943030', marginBottom: 14,
                }}>{formError}</div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Full name *</label>
                <input
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Jana Kovač" autoFocus
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none' }}
                />
              </div>

              {!editUser && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Email address *</label>
                  <input
                    type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jana@example.com"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Role *</label>
                <select
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', background: '#fff' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>
                  {editUser ? 'New password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editUser ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none' }}
                />
              </div>

              {editUser && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#f5f2ee', borderRadius: 8, fontSize: 12, color: '#5a6472' }}>
                  Email: {editUser.email}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              <button onClick={() => setShowModal(false)} style={{
                height: 32, padding: '0 14px', fontSize: 13,
                background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)',
                borderRadius: 8, cursor: 'pointer', color: '#5a6472',
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                height: 32, padding: '0 14px', fontSize: 13,
                background: saving ? '#6aacac' : '#4e8c8c',
                border: 'none', borderRadius: 8, color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>{saving ? 'Saving...' : editUser ? 'Save changes' : 'Create user'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
