'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ──
interface TmDoc { id: string; title: string; record_id: string; revision: string; doc_date: string; prepared_by: string; approved_by: string }
interface RevRow { id: string; revision: string; issue_date: string; description: string; author: string }
interface Req { id: string; req_id: string; text: string; parent_req_id: string | null; parent_req_code: string | null; group_id: string }
interface Group { id: string; name: string; prefix: string; reqs: Req[] }
interface VerEntry { id: string; list_id: string; req_id: string; test_case: string; acceptance_criteria: string; evidence_link: string; extra_values: Record<string, string> }
interface ExtraCol { id: string; list_id: string; name: string; position: number }
interface ReqList { id: string; type: string; name: string | null; groups: Group[]; verEntries: VerEntry[]; extraCols: ExtraCol[] }
interface FmeaRow { id: string; sheet_id: string; mitigation_req_ids: string[] }
interface FmeaSheet { id: string; name: string; prefix: string; rows: FmeaRow[] }

// ── Colors ──
const GROUP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Functional':            { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  'Performance':           { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  'Regulatory':            { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  'Usability':             { bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A' },
  'Safety':                { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  'Security':              { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'Security/Cybersecurity':{ bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'Other':                 { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' },
}
function gc(name: string) { return GROUP_COLORS[name] || { bg: '#f8f7f4', color: '#1a1a18', border: '#D3D1C7' } }

const RISK_COLORS = {
  low:    { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  medium: { bg: '#FFFBCC', color: '#7A6500', border: '#F5E24A' },
  high:   { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
}

// ── Inline cell ──
function Cell({ value, onSave, placeholder, mono = false }: {
  value: string; onSave: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setVal(value) }, [value])
  function commit() { setEditing(false); if (val !== value) onSave(val) }
  if (editing) return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      placeholder={placeholder}
      style={{ width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, outline: 'none', fontFamily: mono ? 'monospace' : 'inherit', background: '#fff' }} />
  )
  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{ fontSize: 12, color: val ? '#1a1a18' : '#ccc', cursor: 'text', minHeight: 20, padding: '2px 0', fontFamily: mono ? 'monospace' : 'inherit', fontStyle: val ? 'normal' : 'italic' }}>
      {val || placeholder || '—'}
    </div>
  )
}

const thStyle = (w?: number): React.CSSProperties => ({
  padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600,
  color: '#5F5E5A', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)',
  borderRight: '0.5px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap',
  ...(w ? { width: w, minWidth: w } : {}),
})
const tdS = (): React.CSSProperties => ({
  padding: '7px 10px', verticalAlign: 'top',
  borderBottom: '0.5px solid rgba(0,0,0,0.06)', borderRight: '0.5px solid rgba(0,0,0,0.04)',
})

// ── Main ──
export default function TraceabilityPage() {
  const params = useParams()
  const projectId = params.id as string

  const [tm, setTm] = useState<TmDoc | null>(null)
  const [revisions, setRevisions] = useState<RevRow[]>([])
  const [lists, setLists] = useState<ReqList[]>([])
  const [fmeaSheets, setFmeaSheets] = useState<FmeaSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('Document Info')

  // New col modal
  const [showNewCol, setShowNewCol] = useState<string | null>(null) // listId
  const [newColName, setNewColName] = useState('')

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/traceability`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    if (!data.tm) { setLoading(false); return }
    setTm(data.tm)
    setRevisions(data.revisions || [])
    setLists(data.lists || [])
    setFmeaSheets(data.fmeaSheets || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  async function createTm() {
    setCreating(true)
    const res = await fetch(`/api/projects/${projectId}/traceability`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    if (res.ok) await load()
    setCreating(false)
  }

  async function patchDoc(fields: Record<string, any>) {
    if (!tm) return
    setTm(t => t ? { ...t, ...fields } : t)
    await fetch(`/api/projects/${projectId}/traceability/${tm.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
  }

  async function patchRevRow(id: string, field: string, value: string) {
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/revision-history`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field, value }) })
  }

  async function addRevRow() {
    const res = await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/revision-history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    if (res.ok) { const row = await res.json(); setRevisions(p => [...p, row]) }
  }

  async function deleteRevRow(id: string) {
    setRevisions(p => p.filter(r => r.id !== id))
    await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/revision-history?rowId=${id}`, { method: 'DELETE' })
  }

  async function patchVer(entryId: string, listId: string, field: string, value: string) {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, verEntries: l.verEntries.map(e => e.id === entryId ? { ...e, [field]: value } : e)
    } : l))
    await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/verification`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entryId, field, value }) })
  }

  async function patchVerExtra(entryId: string, listId: string, extraKey: string, extraValue: string) {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, verEntries: l.verEntries.map(e => e.id === entryId ? { ...e, extra_values: { ...e.extra_values, [extraKey]: extraValue } } : e)
    } : l))
    await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/verification`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entryId, extra_key: extraKey, extra_value: extraValue }) })
  }

  async function addExtraCol(listId: string) {
    if (!newColName.trim()) return
    const res = await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/verification`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_col', list_id: listId, name: newColName.trim() }) })
    if (res.ok) {
      const col = await res.json()
      setLists(prev => prev.map(l => l.id === listId ? { ...l, extraCols: [...l.extraCols, col] } : l))
      setShowNewCol(null); setNewColName('')
    }
  }

  async function deleteExtraCol(listId: string, colId: string) {
    if (!confirm('Delete this column?')) return
    setLists(prev => prev.map(l => l.id === listId ? { ...l, extraCols: l.extraCols.filter(c => c.id !== colId) } : l))
    await fetch(`/api/projects/${projectId}/traceability/${tm!.id}/verification?colId=${colId}`, { method: 'DELETE' })
  }

  // ── Derived data ──
  // All reqs flat
  const allReqs = lists.flatMap(l => l.groups.flatMap(g => g.reqs.map(r => ({ ...r, listId: l.id, listName: l.type === 'system' ? 'System' : l.name, listType: l.type }))))
  // System list
  const systemList = lists.find(l => l.type === 'system')
  // SW lists
  const swLists = lists.filter(l => l.type === 'software')
  // All FMEA rows flat with sheet info
  const allFmeaRows = fmeaSheets.flatMap(s => s.rows.map(r => ({ ...r, sheetName: s.name, prefix: s.prefix })))

  // Risk level helper (simple heuristic — we don't have criteria here, use color by prefix pattern)
  function riskBadge(riskId: string) {
    return (
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#F1EFE8', color: '#5F5E5A', border: '0.5px solid #D3D1C7', fontFamily: 'monospace', whiteSpace: 'nowrap' as const }}>
        {riskId}
      </span>
    )
  }

  const tabs = [
    'Document Info',
    ...(systemList && swLists.length > 0 ? ['SYS ↔ SW Requirements'] : []),
    ...lists.map(l => `Verification: ${l.type === 'system' ? 'System' : l.name}`),
    'Req → Risk',
    'Risk → Req',
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>

  if (!tm) return (
    <div>
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>Project</Link>
        <span>›</span><span style={{ color: '#1a1a18' }}>Traceability Matrix</span>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No Traceability Matrix yet</div>
        <div style={{ fontSize: 13, color: '#6b6a64', marginBottom: 24 }}>Create one to start tracking requirements and risk traceability.</div>
        <button onClick={createTm} disabled={creating}
          style={{ height: 36, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
          {creating ? 'Creating…' : 'Create Traceability Matrix'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>Project</Link>
        <span>›</span><span style={{ color: '#1a1a18' }}>Traceability Matrix</span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, borderBottom: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' as const }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 14px', fontSize: 12, fontWeight: activeTab === tab ? 500 : 400, background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid #185FA5' : '2px solid transparent', color: activeTab === tab ? '#185FA5' : '#6b6a64', whiteSpace: 'nowrap' as const }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ══ Document Info ══ */}
      {activeTab === 'Document Info' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#d9d9d9', padding: '14px 20px', textAlign: 'center', fontSize: 18, fontWeight: 700 }}>Traceability Matrix</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <div style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }}>
                {[['Product', 'title', 'Document title'], ['Form code', 'record_id', 'e.g. TM-240315-01']].map(([label, field, ph]) => (
                  <div key={field} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>{label}</div>
                    <div style={{ padding: '9px 12px' }}><Cell value={(tm as any)[field]} onSave={v => patchDoc({ [field]: v })} placeholder={ph} /></div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Analysis prepared by</div>
                  <div style={{ padding: '9px 12px' }}><Cell value={tm.prepared_by} onSave={v => patchDoc({ prepared_by: v })} placeholder="Name" /></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Record ID</div>
                  <div style={{ padding: '9px 12px' }}><Cell value={tm.record_id} onSave={v => patchDoc({ record_id: v })} placeholder="TM-240315-01" mono /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Revision</div>
                  <div style={{ padding: '9px 12px', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}><Cell value={tm.revision} onSave={v => patchDoc({ revision: v })} placeholder="1.0" mono /></div>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Date</div>
                  <div style={{ padding: '9px 12px' }}><Cell value={tm.doc_date?.split('T')[0] || ''} onSave={v => patchDoc({ doc_date: v })} placeholder="YYYY-MM-DD" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Approved by</div>
                  <div style={{ padding: '9px 12px' }}><Cell value={tm.approved_by} onSave={v => patchDoc({ approved_by: v })} placeholder="Name" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Revision history */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Revision history</div>
              <button onClick={addRevRow} style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>+ Add row</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle(80)}>Revision</th><th style={thStyle(110)}>Issue Date</th>
                <th style={thStyle()}>Description</th><th style={thStyle(160)}>Author</th><th style={thStyle(40)} />
              </tr></thead>
              <tbody>
                {revisions.map(r => (
                  <tr key={r.id}>
                    <td style={tdS()}><Cell value={r.revision} onSave={v => patchRevRow(r.id, 'revision', v)} placeholder="1.0" mono /></td>
                    <td style={tdS()}><Cell value={r.issue_date?.split('T')[0] || ''} onSave={v => patchRevRow(r.id, 'issue_date', v)} placeholder="YYYY-MM-DD" /></td>
                    <td style={tdS()}><Cell value={r.description} onSave={v => patchRevRow(r.id, 'description', v)} placeholder="Description…" /></td>
                    <td style={tdS()}><Cell value={r.author} onSave={v => patchRevRow(r.id, 'author', v)} placeholder="Author" /></td>
                    <td style={tdS()}><button onClick={() => deleteRevRow(r.id)} style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 14 }}>×</button></td>
                  </tr>
                ))}
                {revisions.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#9b9991', fontSize: 12 }}>No rows. Click "+ Add row".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SYS ↔ SW Requirements ══ */}
      {activeTab === 'SYS ↔ SW Requirements' && systemList && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>System ↔ Software Requirements Traceability</div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginTop: 2 }}>Auto-populated from requirements module</div>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle(100), background: '#EEEDFE', color: '#3C3489' }}>SYS Req ID</th>
                  <th style={{ ...thStyle(280), background: '#EEEDFE', color: '#3C3489' }}>System Requirement Text</th>
                  {swLists.map(sl => (
                    <th key={sl.id} style={{ ...thStyle(), background: '#E6F1FB', color: '#0C447C' }}>
                      SW: {sl.name} — Linked Requirements
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {systemList.groups.map(g => {
                  const gc2 = gc(g.name)
                  return (
                    <React.Fragment key={g.id}>
                      <tr>
                        <td colSpan={2 + swLists.length} style={{ padding: '6px 12px', background: gc2.bg, borderBottom: `0.5px solid ${gc2.border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: gc2.color }}>{g.name}</span>
                        </td>
                      </tr>
                      {g.reqs.map(r => {
                        return (
                          <tr key={r.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                            <td style={{ ...tdS(), fontFamily: 'monospace', fontWeight: 600, color: '#3C3489', fontSize: 11 }}>{r.req_id}</td>
                            <td style={tdS()}><span style={{ fontSize: 12 }}>{r.text}</span></td>
                            {swLists.map(sl => {
                              const linkedSW = sl.groups.flatMap(sg => sg.reqs).filter(sr => sr.parent_req_id === r.id)
                              return (
                                <td key={sl.id} style={tdS()}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                                    {linkedSW.length === 0
                                      ? <span style={{ fontSize: 10, color: '#ccc', fontStyle: 'italic' }}>—</span>
                                      : linkedSW.map(sr => (
                                        <span key={sr.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB', fontFamily: 'monospace' }}>
                                          {sr.req_id}
                                        </span>
                                      ))
                                    }
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Verification Sheets ══ */}
      {lists.map(list => {
        const tabName = `Verification: ${list.type === 'system' ? 'System' : list.name}`
        if (activeTab !== tabName) return null
        return (
          <div key={list.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Verification — {list.type === 'system' ? 'System Requirements' : list.name}</div>
                <div style={{ fontSize: 11, color: '#6b6a64', marginTop: 2 }}>{list.verEntries.length} requirements</div>
              </div>
              <button onClick={() => { setShowNewCol(list.id); setNewColName('') }}
                style={{ height: 28, padding: '0 12px', fontSize: 11, background: 'rgba(78,140,140,0.1)', border: '0.5px solid rgba(78,140,140,0.35)', borderRadius: 6, color: '#2e5f5f', cursor: 'pointer' }}>
                + Add column
              </button>
            </div>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle(100)}>Req ID</th>
                    <th style={thStyle(240)}>Requirement Text</th>
                    <th style={thStyle(160)}>Test Case</th>
                    <th style={thStyle(160)}>Acceptance Criteria</th>
                    <th style={thStyle(160)}>Evidence Link</th>
                    {list.extraCols.map(col => (
                      <th key={col.id} style={thStyle(140)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          {col.name}
                          <button onClick={() => deleteExtraCol(list.id, col.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.groups.map(g => {
                    const gEntries = list.verEntries.filter(e => g.reqs.some(r => r.req_id === e.req_id))
                    if (gEntries.length === 0) return null
                    const gc2 = gc(g.name)
                    return (
                      <React.Fragment key={g.id}>
                        <tr>
                          <td colSpan={5 + list.extraCols.length} style={{ padding: '6px 12px', background: gc2.bg, borderBottom: `0.5px solid ${gc2.border}` }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: gc2.color }}>{g.name}</span>
                          </td>
                        </tr>
                        {g.reqs.map(req => {
                          const entry = list.verEntries.find(e => e.req_id === req.req_id)
                          if (!entry) return null
                          return (
                            <tr key={req.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                              <td style={{ ...tdS(), fontFamily: 'monospace', fontWeight: 600, color: '#185FA5', fontSize: 11 }}>{req.req_id}</td>
                              <td style={tdS()}><span style={{ fontSize: 12 }}>{req.text}</span></td>
                              <td style={tdS()}><Cell value={entry.test_case || ''} onSave={v => patchVer(entry.id, list.id, 'test_case', v)} placeholder="Test case…" /></td>
                              <td style={tdS()}><Cell value={entry.acceptance_criteria || ''} onSave={v => patchVer(entry.id, list.id, 'acceptance_criteria', v)} placeholder="Criteria…" /></td>
                              <td style={tdS()}><Cell value={entry.evidence_link || ''} onSave={v => patchVer(entry.id, list.id, 'evidence_link', v)} placeholder="Link or ref…" /></td>
                              {list.extraCols.map(col => (
                                <td key={col.id} style={tdS()}>
                                  <Cell value={entry.extra_values?.[col.id] || ''} onSave={v => patchVerExtra(entry.id, list.id, col.id, v)} placeholder="…" />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* ══ Req → Risk ══ */}
      {activeTab === 'Req → Risk' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Requirement → Risk Traceability</div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginTop: 2 }}>For each requirement, shows risks where it is used as a mitigation measure</div>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle(100)}>Req ID</th>
                <th style={thStyle(280)}>Requirement Text</th>
                <th style={thStyle(80)}>List</th>
                <th style={thStyle()}>Mitigates Risks</th>
              </tr></thead>
              <tbody>
                {lists.map(list => (
                  list.groups.map(g => {
                    const gc2 = gc(g.name)
                    return (
                      <React.Fragment key={g.id}>
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 12px', background: gc2.bg, borderBottom: `0.5px solid ${gc2.border}` }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: gc2.color }}>
                              {list.type === 'system' ? 'System' : list.name} — {g.name}
                            </span>
                          </td>
                        </tr>
                        {g.reqs.map(req => {
                          const risks = allFmeaRows.filter(r => r.mitigation_req_ids?.includes(req.req_id))
                          return (
                            <tr key={req.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', background: risks.length > 0 ? '#fafffe' : '#fff' }}>
                              <td style={{ ...tdS(), fontFamily: 'monospace', fontWeight: 600, color: '#185FA5', fontSize: 11 }}>{req.req_id}</td>
                              <td style={tdS()}><span style={{ fontSize: 12 }}>{req.text}</span></td>
                              <td style={tdS()}>
                                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: list.type === 'system' ? '#EEEDFE' : '#E6F1FB', color: list.type === 'system' ? '#3C3489' : '#0C447C' }}>
                                  {list.type === 'system' ? 'SYS' : 'SW'}
                                </span>
                              </td>
                              <td style={tdS()}>
                                {risks.length === 0
                                  ? <span style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>No linked risks</span>
                                  : <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                                      {risks.map((r, i) => {
                                        const sheetRows = fmeaSheets.find(s => s.id === r.sheet_id)
                                        const rowIdx = sheetRows?.rows.findIndex(rr => rr.id === r.id) ?? 0
                                        const riskId = `${r.prefix}-${String(rowIdx + 1).padStart(2, '0')}`
                                        return riskBadge(riskId)
                                      })}
                                    </div>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Risk → Req ══ */}
      {activeTab === 'Risk → Req' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Risk → Requirement Traceability</div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginTop: 2 }}>For each risk, shows requirements used as mitigation</div>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle(90)}>Risk ID</th>
                <th style={thStyle(100)}>Sheet</th>
                <th style={thStyle()}>Mitigation Requirements</th>
              </tr></thead>
              <tbody>
                {fmeaSheets.map(sheet => (
                  <React.Fragment key={sheet.id}>
                    <tr>
                      <td colSpan={3} style={{ padding: '6px 12px', background: '#E6F1FB', borderBottom: '0.5px solid #85B7EB' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0C447C' }}>{sheet.name}</span>
                      </td>
                    </tr>
                    {sheet.rows.filter(r => r.mitigation_req_ids?.length > 0).map((row, i) => {
                      const riskId = `${sheet.prefix}-${String(i + 1).padStart(2, '0')}`
                      return (
                        <tr key={row.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ ...tdS(), fontFamily: 'monospace', fontWeight: 600, color: '#185FA5', fontSize: 11 }}>{riskId}</td>
                          <td style={tdS()}>
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB' }}>{sheet.name}</span>
                          </td>
                          <td style={tdS()}>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                              {row.mitigation_req_ids.map(rid => {
                                const req = allReqs.find(r => r.req_id === rid)
                                return (
                                  <div key={rid} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC', fontFamily: 'monospace', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{rid}</span>
                                    {req && <span style={{ fontSize: 11, color: '#5F5E5A' }}>{req.text.slice(0, 100)}{req.text.length > 100 ? '…' : ''}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {sheet.rows.filter(r => r.mitigation_req_ids?.length > 0).length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '12px 14px', color: '#ccc', fontSize: 11, fontStyle: 'italic' }}>No risks with linked requirements in this sheet.</td></tr>
                    )}
                  </React.Fragment>
                ))}
                {fmeaSheets.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#9b9991', fontSize: 12 }}>No FMEA data found. Add risks in the Risk Analysis module first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add column modal ── */}
      {showNewCol && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowNewCol(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 340, border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Add Column</div>
            <input value={newColName} onChange={e => setNewColName(e.target.value)}
              placeholder="e.g. Tested by, JIRA link, Result…"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 20 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewCol(null)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => addExtraCol(showNewCol)} disabled={!newColName.trim()}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
