'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ANNEXES = [
  'Annex I', 'Annex II', 'Annex III', 'Annex IV', 'Annex V',
  'Annex VI', 'Annex VII', 'Annex VIII', 'Annex IX', 'Annex X',
]

interface Template {
  id: string
  name: string
  tag_code: string
  annex: string | null
  status: 'active' | 'draft' | 'archived'
  version: string | null
  version_id: string | null
  list_count: number
  project_count: number
  created_by_name: string | null
  created_at: string
}

const STATUS_STYLES = {
  active:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' },
  archived: { bg: '#FDECEA', color: '#7C1C0C', border: '#EB8585' },
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeAnnex, setActiveAnnex] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createTag, setCreateTag] = useState('')
  const [createAnnex, setCreateAnnex] = useState<string>('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to load templates')
      setTemplates(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function nameToTag(name: string) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .map(w => w.slice(0, 4))
      .join('_')
  }

  function handleCreateNameChange(val: string) {
    setCreateName(val)
    if (!createTag || createTag === nameToTag(createName)) {
      setCreateTag(nameToTag(val))
    }
  }

  async function handleCreate() {
    if (!createName.trim() || !createTag.trim()) {
      setCreateError('Name and tag code are required')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, tag_code: createTag, annex: createAnnex || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      router.push(`/dashboard/templates/${data.id}`)
    } catch (e: any) {
      setCreateError(e.message)
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/templates/${deleteTarget.id}`, { method: 'DELETE' })
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

  const annexCounts = ANNEXES.reduce((acc, a) => ({
    ...acc, [a]: templates.filter(t => t.annex === a).length,
  }), {} as Record<string, number>)
  const unassignedCount = templates.filter(t => !t.annex).length

  const filtered = activeAnnex === '__none__'
    ? templates.filter(t => !t.annex)
    : activeAnnex
      ? templates.filter(t => t.annex === activeAnnex)
      : templates

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 34, padding: '0 10px',
    fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box',
    background: '#fafaf8',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 4, display: 'block',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>Template library</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); setCreateAnnex(activeAnnex && activeAnnex !== '__none__' ? activeAnnex : '') }}
          style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: '0.5px solid #185FA5', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
        >+ New template</button>
      </div>

      {loading && <div style={{ color: '#9b9991', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Loading templates…</div>}
      {error && <div style={{ color: '#7C1C0C', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '176px minmax(0,1fr)', gap: 14 }}>

          {/* Annex sidebar */}
          <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden', alignSelf: 'start' }}>
            <div onClick={() => setActiveAnnex(null)} style={{
              padding: '9px 12px', cursor: 'pointer', fontSize: 13,
              borderBottom: '0.5px solid rgba(0,0,0,0.06)',
              background: activeAnnex === null ? '#E6F1FB' : '#fff',
              color: activeAnnex === null ? '#0C447C' : '#1a1a18',
              fontWeight: activeAnnex === null ? 500 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>All</span>
              <span style={{ fontSize: 11, borderRadius: 20, padding: '1px 6px', background: activeAnnex === null ? '#B5D4F4' : '#f1efe8', color: activeAnnex === null ? '#0C447C' : '#9b9991' }}>{templates.length}</span>
            </div>
            {ANNEXES.map(a => (
              <div key={a} onClick={() => setActiveAnnex(a)} style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                background: activeAnnex === a ? '#E6F1FB' : '#fff',
                color: activeAnnex === a ? '#0C447C' : annexCounts[a] === 0 ? '#ccc' : '#1a1a18',
                fontWeight: activeAnnex === a ? 500 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{a}</span>
                <span style={{ fontSize: 11, borderRadius: 20, padding: '1px 6px', background: activeAnnex === a ? '#B5D4F4' : '#f1efe8', color: activeAnnex === a ? '#0C447C' : '#9b9991' }}>{annexCounts[a] || 0}</span>
              </div>
            ))}
            <div onClick={() => setActiveAnnex('__none__')} style={{
              padding: '9px 12px', cursor: 'pointer', fontSize: 13,
              background: activeAnnex === '__none__' ? '#E6F1FB' : '#fff',
              color: activeAnnex === '__none__' ? '#0C447C' : unassignedCount === 0 ? '#ccc' : '#9b9991',
              fontWeight: activeAnnex === '__none__' ? 500 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Unassigned</span>
              <span style={{ fontSize: 11, borderRadius: 20, padding: '1px 6px', background: activeAnnex === '__none__' ? '#B5D4F4' : '#f1efe8', color: activeAnnex === '__none__' ? '#0C447C' : '#9b9991' }}>{unassignedCount}</span>
            </div>
          </div>

          {/* Template grid */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ color: '#9b9991', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
                {activeAnnex ? `No templates in ${activeAnnex === '__none__' ? 'Unassigned' : activeAnnex}.` : 'No templates yet. Create your first one.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {filtered.map(t => {
                  const st = STATUS_STYLES[t.status] || STATUS_STYLES.draft
                  return (
                    <div key={t.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600,
                        }}>DOC</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>${t.tag_code}</span>
                            {t.annex && (
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#f1efe8', color: '#6b6a64', border: '0.5px solid #D3D1C7' }}>{t.annex}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>{t.status}</span>
                          <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{t.version ?? '—'}</span>
                        </div>
                      </div>

                      <div style={{
                        padding: '8px 16px', borderTop: '0.5px solid rgba(0,0,0,0.06)',
                        background: '#f8f7f4', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', fontSize: 11, color: '#9b9991',
                      }}>
                        <span>
                          {t.project_count} project{t.project_count !== 1 ? 's' : ''}
                          {' · '}
                          {t.list_count} list{t.list_count !== 1 ? 's' : ''}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => router.push(`/dashboard/templates/${t.id}`)}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: '#185FA5', cursor: 'pointer' }}
                          >Edit →</button>
                          <button
                            onClick={() => { setDeleteTarget(t); setDeleteError(null) }}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: '#A32D2D', cursor: 'pointer' }}
                          >Delete</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Delete template?</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 10, lineHeight: 1.5 }}>
              You are about to permanently delete:
            </div>
            <div style={{ background: '#FDECEA', border: '0.5px solid #EB8585', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7C1C0C' }}>{deleteTarget.name}</div>
              <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2, fontFamily: 'monospace' }}>${deleteTarget.tag_code}</div>
              {deleteTarget.annex && (
                <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 1 }}>{deleteTarget.annex}</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 20, lineHeight: 1.6 }}>
              This will delete the template and all its versions. Templates used in project records cannot be deleted.
            </div>

            {deleteError && (
              <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 12, padding: '8px 10px', background: '#FDECEA', border: '0.5px solid #EB8585', borderRadius: 6 }}>
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
              >{deleting ? 'Deleting…' : 'Yes, delete template'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24, width: 420,
            border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>New template</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Template name</label>
              <input style={inputStyle} value={createName} onChange={e => handleCreateNameChange(e.target.value)} placeholder="e.g. Risk Management File" autoFocus />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Tag code
                <span style={{ fontWeight: 400, color: '#9b9991', marginLeft: 6 }}>used as $$tag in records</span>
              </label>
              <input
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                value={createTag}
                onChange={e => setCreateTag(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g. RISK_MGMT"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Annex <span style={{ fontWeight: 400, color: '#9b9991' }}>(optional)</span></label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={createAnnex} onChange={e => setCreateAnnex(e.target.value)}>
                <option value="">— Unassigned —</option>
                {ANNEXES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {createError && <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 12 }}>{createError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, color: '#5F5E5A' }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer', background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating…' : 'Create & edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
