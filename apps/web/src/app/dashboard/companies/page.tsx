'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Company {
  id: string; name: string; country: string | null
  member_count: number; project_count: number
}

export default function CompaniesPage() {
  const [sessionRole, setSessionRole] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', contact: '', email: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    fetch('/api/companies').then(r => r.ok ? r.json() : []).then(d => {
      setCompanies(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Company name is required'); return }
    setSaving(true)
    const res = await fetch('/api/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Failed'); setSaving(false); return }
    setShowModal(false)
    setForm({ name: '', country: '', contact: '', email: '' })
    fetch('/api/companies').then(r => r.ok ? r.json() : []).then(d => setCompanies(Array.isArray(d) ? d : []))
    setSaving(false)
  }

  const isAdmin = sessionRole === 'admin'
  const isClient = sessionRole === 'client' || sessionRole === 'client-MR'
  const inputStyle = { width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }

  // Clients — dashboard placeholder
  if (isClient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#9b9991', textAlign: 'center' as const }}>
        <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='0.8' strokeLinecap='round' opacity='0.25'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
        <div style={{ fontSize: 14, color: '#6b6a64' }}>Select a company or project from the sidebar</div>
        <div style={{ fontSize: 12, color: '#9b9991', maxWidth: 280, lineHeight: 1.6 }}>Your dashboard will show project status, open comments and activity here.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>Companies</h1>
          <p style={{ fontSize: 13, color: '#5a6472' }}>Manage client companies and their modules</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            + New company
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
      ) : companies.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
          No companies yet.{isAdmin ? ' Click “+ New company” to add one.' : ''}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => window.location.href = `/dashboard/companies/${c.id}`}
              style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{c.name}</div>
                  {c.country && <div style={{ fontSize: 12, color: '#9b9991' }}>{c.country}</div>}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(78,140,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#4e8c8c' strokeWidth='1.5' strokeLinecap='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div><div style={{ fontSize: 10, color: '#9b9991', marginBottom: 2 }}>Members</div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.member_count}</div></div>
                <div><div style={{ fontSize: 10, color: '#9b9991', marginBottom: 2 }}>TF Projects</div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.project_count}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, border: '0.5px solid rgba(0,0,0,0.12)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 500 }}>New company</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {formError && <div style={{ background: 'rgba(148,48,48,0.08)', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#943030' }}>{formError}</div>}
              <div><label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Company name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder='Acme Medical' autoFocus style={inputStyle} /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder='e.g. Norway' style={inputStyle} /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Contact person</label><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder='John Smith' style={inputStyle} /></div>
              <div><label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Contact email</label><input type='email' value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder='john@acme.com' style={inputStyle} /></div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
