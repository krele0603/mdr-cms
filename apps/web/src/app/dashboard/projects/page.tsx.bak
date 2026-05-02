'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  device_name: string
  manufacturer_name: string
  manufacturer_country: string
  status: string
  created_at: string
  list_name: string
  total_docs: number
  approved_docs: number
}

interface DocList {
  id: string
  name: string
  doc_count: number
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Active' },
  review:   { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'Under review' },
  approved: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
  archived: { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7', label: 'Archived' },
}

const EMPTY_FORM = {
  name: '', device_name: '', description: '',
  manufacturer_name: '', manufacturer_country: '',
  manufacturer_contact: '', manufacturer_email: '',
  list_id: '',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [lists, setLists] = useState<DocList[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    const [pr, lr] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/lists').then(r => r.json()),
    ])
    setProjects(pr.projects || [])
    setLists(lr.lists || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to delete')
      }
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Project name is required'); return }
    if (!form.device_name.trim()) { setFormError('Device name is required'); return }
    if (!form.manufacturer_name.trim()) { setFormError('Manufacturer name is required'); return }
    if (!form.list_id) { setFormError('Please select a document list'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to create project'); setSaving(false); return }
      setShowModal(false)
      load()
    } catch { setFormError('Connection error') }
    setSaving(false)
  }

  const filtered = projects.filter(p => !filterStatus || p.status === filterStatus)
  const counts = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    review: projects.filter(p => p.status === 'review').length,
    approved: projects.filter(p => p.status === 'approved').length,
  }

  const input = (label: string, key: keyof typeof form, placeholder: string, type = 'text') => (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none' }} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>Projects</h1>
          <p style={{ fontSize: 13, color: '#6b6a64' }}>MDR technical file projects</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true) }}
          style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: '0.5px solid #185FA5', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
          + New project
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'All projects', val: counts.total, f: '', color: '#1a1a18' },
          { label: 'Active', val: counts.active, f: 'active', color: '#185FA5' },
          { label: 'Under review', val: counts.review, f: 'review', color: '#854F0B' },
          { label: 'Approved', val: counts.approved, f: 'approved', color: '#3B6D11' },
        ].map(s => (
          <div key={s.f} onClick={() => setFilterStatus(s.f === filterStatus ? '' : s.f)}
            style={{ background: filterStatus === s.f ? '#E6F1FB' : '#f8f7f4', border: filterStatus === s.f ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
            <div style={{ fontSize: 12, color: '#6b6a64', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
            {projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match your filter.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f7f4' }}>
                {['Project / device', 'Client', 'List', 'Progress', 'Status', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#6b6a64', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const total = Number(p.total_docs)
                const done = Number(p.approved_docs)
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const s = STATUS_STYLE[p.status] || STATUS_STYLE.draft
                return (
                  <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>{p.device_name}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div>{p.manufacturer_name}</div>
                      <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>{p.manufacturer_country}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB', padding: '2px 7px', borderRadius: 4 }}>{p.list_name || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#3B6D11' : '#185FA5', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#9b9991', whiteSpace: 'nowrap' as const }}>{done}/{total}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, padding: '2px 8px', borderRadius: 20 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#9b9991' }}>
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <Link href={`/dashboard/projects/${p.id}`}
                          style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none', padding: '4px 10px', border: '0.5px solid #85B7EB', borderRadius: 6, background: '#E6F1FB' }}>
                          Open
                        </Link>
                        <button
                          onClick={() => { setDeleteTarget(p); setDeleteError(null) }}
                          style={{ fontSize: 12, color: '#A32D2D', padding: '4px 8px', border: '0.5px solid #F09595', borderRadius: 6, background: '#FCEBEB', cursor: 'pointer' }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 420,
            border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#1a1a18' }}>
              Delete project?
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 6, lineHeight: 1.5 }}>
              You are about to permanently delete:
            </div>
            <div style={{
              background: '#FDECEA', border: '0.5px solid #EB8585',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7C1C0C' }}>{deleteTarget.name}</div>
              <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 2 }}>{deleteTarget.device_name}</div>
            </div>
            <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently delete the project and <strong>all its records</strong>. This action cannot be undone.
            </div>

            {deleteError && (
              <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 12, padding: '8px 10px', background: '#FDECEA', borderRadius: 6 }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, color: '#5F5E5A' }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: deleting ? 'default' : 'pointer', background: '#C0392B', border: 'none', borderRadius: 8, color: '#fff', opacity: deleting ? 0.7 : 1 }}
              >{deleting ? 'Deleting…' : 'Yes, delete project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, border: '0.5px solid rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 500 }}>New project</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b6a64' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {formError && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#A32D2D', marginBottom: 14 }}>{formError}</div>}
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a64', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>Client / manufacturer</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {input('Manufacturer name *', 'manufacturer_name', 'e.g. Acme Medical GmbH')}
                {input('Country', 'manufacturer_country', 'e.g. Germany')}
                {input('Contact person', 'manufacturer_contact', 'e.g. Jane Smith')}
                {input('Email', 'manufacturer_email', 'jane@acme.com', 'email')}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a64', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '16px 0 10px' }}>Device & project</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {input('Device name *', 'device_name', 'e.g. CardioMonitor Pro')}
                {input('Project name *', 'name', 'e.g. CardioMonitor MDR TF')}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Document list *</label>
                <select value={form.list_id} onChange={e => setForm(f => ({ ...f, list_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Select a list...</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.doc_count} docs)</option>)}
                </select>
              </div>
              {input('Description', 'description', 'Brief scope or notes')}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ height: 32, padding: '0 14px', fontSize: 13, background: saving ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creating...' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
