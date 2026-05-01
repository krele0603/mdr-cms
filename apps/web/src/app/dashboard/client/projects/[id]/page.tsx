'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import FilePanel from '@/components/FilePanel'

const ANNEXES = ['Annex I','Annex II','Annex III','Annex IV','Annex V',
                 'Annex VI','Annex VII','Annex VIII','Annex IX','Annex X']

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:      { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  inprogress: { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'In progress' },
  review:     { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'In review' },
  approved:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
}

const PROJ_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Active' },
  review:   { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'Under review' },
  approved: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
  archived: { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7', label: 'Archived' },
}

const COLOR_FLAGS: Record<string, { bg: string; color: string; border: string; label: string; dot: string }> = {
  green:  { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Done',        dot: '#3B6D11' },
  yellow: { bg: '#FFFBCC', color: '#7A6500', border: '#F5E24A', label: 'In progress', dot: '#F5D800' },
  orange: { bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A', label: 'Not started', dot: '#E07820' },
  red:    { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595', label: 'Blocked',     dot: '#C0392B' },
  none:   { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'No flag',     dot: '#ccc' },
}

interface Member {
  id: string; user_id: string; name: string; email: string; user_role: string; role: string; joined_at: string
}

interface TrackerDoc {
  id: string; annex: string; name: string; code: string; status: string
  revision: string | null; color_flag: string | null; tracker_comment: string | null
  assigned_to: string | null; assigned_name: string | null
}

function EditableCell({ value, onSave, placeholder, mono = false }: {
  value: string; onSave: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setVal(value) }, [value])
  function commit() { setEditing(false); if (val !== value) onSave(val) }
  if (editing) return (
    <input ref={ref} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      placeholder={placeholder}
      style={{ width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, outline: 'none', fontFamily: mono ? 'monospace' : 'inherit', background: '#fff' }}
    />
  )
  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{ fontSize: 12, color: val ? '#1a1a18' : '#bbb', cursor: 'text', minHeight: 20, padding: '2px 0', fontFamily: mono ? 'monospace' : 'inherit' }}>
      {val || <span style={{ color: '#ccc', fontStyle: 'italic' }}>{placeholder || '—'}</span>}
    </div>
  )
}

function ColorPicker({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = COLOR_FLAGS[value || 'none']
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} title="Click to change flag"
        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '2px 7px', borderRadius: 12, background: current.bg, border: `0.5px solid ${current.border}`, fontSize: 11, color: current.color, whiteSpace: 'nowrap' as const, userSelect: 'none' as const }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: current.dot, flexShrink: 0 }} />
        {current.label}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 26, left: 0, zIndex: 50, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 130 }}>
          {Object.entries(COLOR_FLAGS).map(([key, cf]) => (
            <div key={key} onClick={() => { onSave(key === 'none' ? '' : key); setOpen(false) }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: cf.color }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cf.dot, flexShrink: 0 }} />
              {cf.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssignedPicker({ value, name, members, onSave }: {
  value: string | null; name: string | null; members: Member[]; onSave: (id: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} title="Click to assign"
        style={{ fontSize: 12, cursor: 'pointer', color: name ? '#1a1a18' : '#bbb', fontStyle: name ? 'normal' : 'italic', whiteSpace: 'nowrap' as const, userSelect: 'none' as const }}>
        {name || 'Unassigned'}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 22, left: 0, zIndex: 50, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 180 }}>
          <div onClick={() => { onSave('', ''); setOpen(false) }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#9b9991', fontStyle: 'italic' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>Unassigned</div>
          {members.map(m => (
            <div key={m.user_id} onClick={() => { onSave(m.user_id, m.name); setOpen(false) }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <div style={{ fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: '#9b9991' }}>{m.user_role}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trackerDocs, setTrackerDocs] = useState<TrackerDoc[]>([])
  const [allProjectFiles, setAllProjectFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionRole, setSessionRole] = useState('')
  const [activeAnnex, setActiveAnnex] = useState('Annex I')
  const [trackerOpen, setTrackerOpen] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    fetch(`/api/projects/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setProject(data.project)
        setDocs(data.docs)
        setTrackerDocs(data.docs.map((d: any) => ({
          id: d.id, annex: d.annex, name: d.name, code: d.code, status: d.status,
          revision: d.revision || null, color_flag: d.color_flag || null,
          tracker_comment: d.tracker_comment || null,
          assigned_to: d.assigned_to || null, assigned_name: d.assigned_name || null,
        })))
        setLoading(false)
        const firstWithDocs = ANNEXES.find(a => data.docs.some((d: any) => d.annex === a))
        if (firstWithDocs) setActiveAnnex(firstWithDocs)
      })
      .catch(() => router.push('/dashboard/client'))

    fetch(`/api/projects/${id}/files`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setAllProjectFiles(data.files || []))

    fetch(`/api/projects/${id}/members`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setMembers(data))
  }, [id])

  async function patchDoc(docId: string, fields: Record<string, any>) {
    setSaving(s => ({ ...s, [docId]: true }))
    await fetch(`/api/projects/${id}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(s => ({ ...s, [docId]: false }))
    setTrackerDocs(prev => prev.map(d => d.id === docId ? { ...d, ...fields } : d))
  }

  if (loading) return (
    <div style={{ color: '#9b9991', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
      Loading project…
    </div>
  )
  if (!project) return null

  const annexDocs = docs.filter((d: any) => d.annex === activeAnnex)
  const annexCounts = ANNEXES.reduce((acc, a) => ({
    ...acc, [a]: docs.filter((d: any) => d.annex === a).length
  }), {} as Record<string, number>)

  const total = docs.length
  const approved = docs.filter((d: any) => d.status === 'approved').length
  const inprog = docs.filter((d: any) => d.status === 'inprogress' || d.status === 'review').length
  const draft = docs.filter((d: any) => d.status === 'draft').length
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0
  const ps = PROJ_STATUS[project.status] || PROJ_STATUS.draft
  const trackerByAnnex = ANNEXES.map(a => ({ annex: a, docs: trackerDocs.filter(d => d.annex === a) })).filter(g => g.docs.length > 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/client" style={{ color: '#9b9991', textDecoration: 'none' }}>My Projects</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>{project.name}</span>
      </div>

      {/* Project header */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 2 }}>{project.name}</div>
            <div style={{ fontSize: 13, color: '#6b6a64' }}>{project.device_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' as const, marginTop: 8 }}>
              {project.list_name && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB' }}>{project.list_name}</span>
              )}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: ps.bg, color: ps.color, border: `0.5px solid ${ps.border}` }}>{ps.label}</span>
              <span style={{ fontSize: 11, color: '#9b9991' }}>{project.manufacturer_name}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: pct === 100 ? '#27500A' : '#1a1a18' }}>{pct}%</div>
            <div style={{ fontSize: 11, color: '#9b9991', marginBottom: 6 }}>{approved} / {total} approved</div>
            <div style={{ height: 4, width: 120, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#3B6D11' : '#185FA5', borderRadius: 2 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 2 }}>Approved</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#3B6D11' }}>{approved}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 2 }}>In progress</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#BA7517' }}>{inprog}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 2 }}>Draft</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{draft}</div>
          </div>
        </div>
      </div>

      {/* Annex + docs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '176px minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          {ANNEXES.map(a => {
            const count = annexCounts[a] || 0
            const active = a === activeAnnex
            return (
              <div key={a} onClick={() => setActiveAnnex(a)}
                style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: active ? '#E6F1FB' : '#fff', color: active ? '#0C447C' : count === 0 ? '#ccc' : '#1a1a18', fontWeight: active ? 500 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{a}</span>
                <span style={{ fontSize: 11, borderRadius: 20, padding: '1px 6px', background: active ? '#B5D4F4' : '#f1efe8', color: active ? '#0C447C' : '#9b9991' }}>{count}</span>
              </div>
            )
          })}
        </div>

        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{activeAnnex}</div>
            <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>{annexDocs.length} document{annexDocs.length !== 1 ? 's' : ''}</div>
          </div>

          {annexDocs.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>No documents in {activeAnnex}.</div>
          ) : annexDocs.map((d: any) => {
            const s = DOC_STATUS[d.status] || DOC_STATUS.draft
            const isApproved = d.status === 'approved'
            return (
              <div key={d.id} style={{ padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: isApproved ? '#fcfdfb' : '#fff' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', color: isApproved ? '#27500A' : '#1a1a18' }}>{d.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{d.code}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, fontWeight: 500 }}>{s.label}</span>
                  </div>
                </div>
                <Link href={`/dashboard/projects/${id}/documents/${d.id}`}
                  style={{ height: 26, padding: '0 10px', fontSize: 11, background: isApproved ? 'transparent' : '#185FA5', border: isApproved ? '0.5px solid #97C459' : 'none', borderRadius: 6, color: isApproved ? '#27500A' : '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  {isApproved ? 'View' : 'Open'}
                </Link>
              </div>
            )
          })}

          <FilePanel projectId={id} annex={activeAnnex} sessionRole={sessionRole} />

          {activeAnnex === 'Annex III' && (
            <div style={{ padding: '11px 14px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(24,95,165,0.03)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#185FA5' }}>Requirements</div>
                <div style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace', marginTop: 1 }}>REQUIREMENTS</div>
              </div>
              <Link href={`/dashboard/projects/${id}/requirements`} style={{ height: 26, padding: '0 14px', fontSize: 11, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 6, color: '#185FA5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}>Open Requirements</Link>
            </div>
          )}
          {activeAnnex === 'Annex V' && (
            <div style={{ padding: '11px 14px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(165,40,40,0.03)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#8B1A1A' }}>Risk Analysis (FMEA)</div>
                <div style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace', marginTop: 1 }}>FMEA</div>
              </div>
              <Link href={`/dashboard/projects/${id}/fmea`} style={{ height: 26, padding: '0 14px', fontSize: 11, background: 'rgba(165,40,40,0.07)', border: '0.5px solid rgba(165,40,40,0.25)', borderRadius: 6, color: '#8B1A1A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>Open FMEA</Link>
            </div>
          )}
          {activeAnnex === 'Annex VI' && (
            <div style={{ padding: '11px 14px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(60,52,137,0.03)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#3C3489' }}>Traceability Matrix</div>
                <div style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace', marginTop: 1 }}>TRACEABILITY</div>
              </div>
              <Link href={`/dashboard/projects/${id}/traceability`} style={{ height: 26, padding: '0 14px', fontSize: 11, background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 6, color: '#3C3489', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}>Open Traceability</Link>
            </div>
          )}
        </div>
      </div>

      {/* Status Tracker — fully editable for clients */}
      <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
        <div onClick={() => setTrackerOpen(o => !o)}
          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: trackerOpen ? '#f8f7f4' : '#fff', borderBottom: trackerOpen ? '0.5px solid rgba(0,0,0,0.08)' : 'none', userSelect: 'none' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Document Status Tracker</div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: trackerOpen ? '#185FA5' : '#f1efe8', color: trackerOpen ? '#fff' : '#6b6a64', border: trackerOpen ? 'none' : '0.5px solid #D3D1C7' }}>
              {trackerOpen ? 'ON' : 'OFF'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {trackerOpen && (
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b6a64' }}>
                {Object.entries(COLOR_FLAGS).filter(([k]) => k !== 'none').map(([key, cf]) => {
                  const count = trackerDocs.filter(d => d.color_flag === key).length
                  return (
                    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cf.dot }} />
                      {cf.label}: {count}
                    </span>
                  )
                })}
              </div>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9991" strokeWidth="2" strokeLinecap="round"
              style={{ transform: trackerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {trackerOpen && (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f7f4' }}>
                  {['Annex', 'Document', 'Code', 'Status', 'Rev.', 'Flag', 'Comment', 'Assigned to'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#6b6a64', borderBottom: '0.5px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackerByAnnex.map(({ annex, docs: adocs }) => (
                  [...adocs.map((d, i) => {
                    const s = DOC_STATUS[d.status] || DOC_STATUS.draft
                    const isSaving = saving[d.id]
                    return (
                      <tr key={d.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', background: isSaving ? '#fafffe' : '#fff' }}>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 11, whiteSpace: 'nowrap' as const, borderRight: '0.5px solid rgba(0,0,0,0.05)', color: i === 0 ? '#1a1a18' : 'transparent', fontWeight: i === 0 ? 500 : 400 }}>
                          {i === 0 ? annex : ''}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', maxWidth: 200 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.name}>{d.name}</div>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{d.code}</span>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, whiteSpace: 'nowrap' as const }}>{s.label}</span>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 60 }}>
                          <EditableCell value={d.revision || ''} placeholder="1.0" mono onSave={v => patchDoc(d.id, { revision: v })} />
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          <ColorPicker value={d.color_flag} onSave={v => patchDoc(d.id, { color_flag: v || null })} />
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 160 }}>
                          <EditableCell value={d.tracker_comment || ''} placeholder="Add comment…" onSave={v => patchDoc(d.id, { tracker_comment: v })} />
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 130 }}>
                          <AssignedPicker
                            value={d.assigned_to} name={d.assigned_name} members={members}
                            onSave={(uid, name) => {
                              patchDoc(d.id, { assigned_to: uid || null })
                              setTrackerDocs(prev => prev.map(td => td.id === d.id ? { ...td, assigned_to: uid || null, assigned_name: name || null } : td))
                            }}
                          />
                        </td>
                      </tr>
                    )
                  }),
                  ...allProjectFiles.filter((f: any) => f.annex === annex).map((f: any) => (
                    <tr key={`file-${f.id}`} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', background: '#fafff8' }}>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 11, borderRight: '0.5px solid rgba(0,0,0,0.05)', color: 'transparent' }}></td>
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', maxWidth: 200 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>📎</span>
                          <span style={{ whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.original_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 10, color: '#9b9991' }}>{(f.file_size/1024/1024).toFixed(1)}MB</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB' }}>Uploaded</span>
                      </td>
                      <td colSpan={4} style={{ padding: '9px 12px', fontSize: 11, color: '#9b9991' }}>{f.uploaded_by_name}</td>
                    </tr>
                  ))]
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
