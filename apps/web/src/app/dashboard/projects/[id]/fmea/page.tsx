'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────
interface FmeaDoc {
  id: string; project_id: string; title: string; record_id: string
  form_code: string; revision: string; doc_date: string
  prepared_by: string; approved_by: string
}
interface RevRow { id: string; revision: string; issue_date: string; description: string; author: string }
interface RmRow { id: string; no: number; name: string; role: string; organisation: string; knowledge: string }
interface Criteria { id: string; r1_min: number; r1_max: number; r2_min: number; r2_max: number; r3_min: number; r3_max: number }
interface AnnexQuestion { id: string; code: string; question: string; sub_bullets: string; position: number }
interface AnnexAnswer { id: string; question_id: string; answer: string; input_to_ra: string; risk_ids: string }
interface FmeaRow {
  id: string; position: number
  hazard: string; sequence_of_events: string; hazardous_situation: string; harm: string
  probability: number | null; severity: number | null
  mitigation: string; mitigation_req_ids: string[]
  residual_probability: number | null; residual_severity: number | null
  verification_document: string; residual_hazard: string; benefit_analysis: string; new_hazards: string
}
interface ReqListInfo { id: string; type: string; name: string | null }
interface ReqGroupInfo { id: string; name: string; prefix: string; reqs: { id: string; req_id: string; text: string }[] }
interface ReqListFull extends ReqListInfo { groups: ReqGroupInfo[] }
interface Sheet { id: string; name: string; prefix: string; position: number; rows: FmeaRow[] }

// ── Helpers ────────────────────────────────────────────────
function getRiskLevel(value: number | null, criteria: Criteria | null): { label: string; bg: string; color: string; border: string } {
  if (!value || !criteria) return { label: '—', bg: '#f1efe8', color: '#9b9991', border: '#D3D1C7' }
  if (value <= criteria.r1_max) return { label: 'LOW RISK', bg: '#EAF3DE', color: '#27500A', border: '#97C459' }
  if (value <= criteria.r2_max) return { label: 'MEDIUM RISK', bg: '#FFFBCC', color: '#7A6500', border: '#F5E24A' }
  return { label: 'HIGH RISK', bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' }
}

function hazardNo(prefix: string, position: number): string {
  return `${prefix}-${String(position).padStart(2, '0')}`
}

// ── Inline editable cell ───────────────────────────────────
function Cell({ value, onSave, placeholder, mono = false, numeric = false, width }: {
  value: string; onSave: (v: string) => void; placeholder?: string
  mono?: boolean; numeric?: boolean; width?: number
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  useEffect(() => { setVal(value) }, [value])
  function commit() { setEditing(false); if (val !== value) onSave(val) }

  const style: React.CSSProperties = {
    fontSize: 11, fontFamily: mono ? 'monospace' : 'inherit',
    width: width ? `${width}px` : '100%',
    background: 'transparent', border: 'none', outline: 'none',
    color: val ? '#1a1a18' : '#bbb', cursor: 'text', padding: 0,
    resize: 'none' as const, lineHeight: 1.4,
  }

  if (editing) {
    if (numeric) return (
      <input ref={ref as any} type="number" min={1} max={5} value={val}
        onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit() }}
        style={{ ...style, width: 36, border: '1px solid #185FA5', borderRadius: 4, padding: '2px 4px', background: '#fff', textAlign: 'center' }} />
    )
    return (
      <textarea ref={ref as any} value={val}
        onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) commit() }}
        placeholder={placeholder}
        rows={3}
        style={{ ...style, border: '1px solid #185FA5', borderRadius: 4, padding: '3px 6px', background: '#fff', width: '100%' }} />
    )
  }

  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{ ...style, minHeight: 18, whiteSpace: 'pre-wrap' as const }}>
      {val || <span style={{ color: '#ccc', fontStyle: 'italic' }}>{placeholder || '—'}</span>}
    </div>
  )
}

// ── MitigationCell ──────────────────────────────────────────
function MitigationCell({ reqIds, notes, reqLists, onSaveReqIds, onSaveNotes }: {
  reqIds: string[]; notes: string
  reqLists: ReqListFull[]
  onSaveReqIds: (ids: string[]) => void
  onSaveNotes: (v: string) => void
}) {
  const [step, setStep] = useState<'closed' | 'list' | 'browse'>('closed')
  const [selectedList, setSelectedList] = useState<ReqListFull | null>(null)
  const [search, setSearch] = useState('')
  const dropRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (step === 'closed') return
    function handleMouseDown(e: MouseEvent) {
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      setStep('closed'); setSearch('')
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [step])

  function handleOpen() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const flipUp = spaceBelow < 300
      setDropPos({
        top: flipUp ? rect.top + window.scrollY - 280 : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      })
    }
    if (reqLists.length === 1) { setSelectedList(reqLists[0]); setStep('browse') }
    else setStep(step === 'closed' ? 'list' : 'closed')
  }

  function toggleReq(reqId: string) {
    const next = reqIds.includes(reqId) ? reqIds.filter(r => r !== reqId) : [...reqIds, reqId]
    onSaveReqIds(next)
  }

  function removeReq(reqId: string) {
    onSaveReqIds(reqIds.filter(r => r !== reqId))
  }

  const allReqs = selectedList?.groups.flatMap(g =>
    g.reqs.filter(r => !search || r.req_id.toLowerCase().includes(search.toLowerCase()) || r.text.toLowerCase().includes(search.toLowerCase()))
      .map(r => ({ ...r, groupName: g.name }))
  ) || []

  return (
    <div>
      {/* Picker row */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: reqIds.length > 0 ? 6 : 4 }}>
        <button ref={triggerRef} onClick={handleOpen}
          style={{ height: 20, padding: '0 7px', fontSize: 10, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 4, color: '#185FA5', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
          + Link req
        </button>
        {reqIds.map(rid => {
          let reqText = ''
          for (const l of reqLists) {
            for (const g of l.groups) {
              const found = g.reqs.find((r: any) => r.req_id === rid)
              if (found) { reqText = found.text; break }
            }
            if (reqText) break
          }
          return (
            <div key={rid} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, width: '100%', marginBottom: 2 }}>
              <span style={{ fontSize: 10, padding: '1px 5px', background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 3, color: '#3C3489', fontFamily: 'monospace', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{rid}</span>
              {reqText && <span style={{ fontSize: 10, color: '#5F5E5A', lineHeight: 1.4, flex: 1 }}>{reqText.slice(0, 80)}{reqText.length > 80 ? '…' : ''}</span>}
              <span onClick={() => removeReq(rid)} style={{ cursor: 'pointer', color: '#9b9991', fontSize: 12, lineHeight: 1, flexShrink: 0 }}>×</span>
            </div>
          )
        })}
      </div>

      {/* Dropdown */}
      {step !== 'closed' && (
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', width: 300, maxHeight: 280, display: 'flex', flexDirection: 'column' as const }}>
          {step === 'list' && (
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6b6a64', marginBottom: 8 }}>Select requirements list</div>
              {reqLists.map(l => (
                <div key={l.id} onClick={() => { setSelectedList(l); setStep('browse') }}
                  style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, border: '0.5px solid rgba(0,0,0,0.1)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: l.type === 'system' ? '#EEEDFE' : '#E6F1FB', color: l.type === 'system' ? '#3C3489' : '#0C447C' }}>
                    {l.type === 'system' ? 'SYS' : 'SW'}
                  </span>
                  {l.type === 'system' ? 'System Requirements' : l.name}
                </div>
              ))}
              {reqLists.length === 0 && <div style={{ fontSize: 11, color: '#9b9991', fontStyle: 'italic' }}>No requirements lists found for this project.</div>}
            </div>
          )}
          {step === 'browse' && selectedList && (
            <>
              <div style={{ padding: '8px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {reqLists.length > 1 && (
                  <button onClick={() => { setStep('list'); setSearch('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 14, padding: '0 4px 0 0' }}>‹</button>
                )}
                <span style={{ fontSize: 11, fontWeight: 500, flex: 1 }}>{selectedList.type === 'system' ? 'System Requirements' : selectedList.name}</span>
              </div>
              <div style={{ padding: '6px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search req ID or text…" autoFocus
                  style={{ width: '100%', padding: '4px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ overflowY: 'auto' as const, flex: 1 }}>
                {selectedList.groups.map(g => {
                  const filtered = g.reqs.filter(r => !search || r.req_id.toLowerCase().includes(search.toLowerCase()) || r.text.toLowerCase().includes(search.toLowerCase()))
                  if (filtered.length === 0) return null
                  return (
                    <div key={g.id}>
                      <div style={{ padding: '4px 10px', fontSize: 9, fontWeight: 600, color: '#9b9991', background: '#f8f7f4', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{g.name}</div>
                      {filtered.map(r => (
                        <div key={r.id} onClick={() => toggleReq(r.req_id)}
                          style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: '0.5px solid rgba(0,0,0,0.04)', background: reqIds.includes(r.req_id) ? '#F0F7FF' : '#fff' }}
                          onMouseEnter={e => { if (!reqIds.includes(r.req_id)) e.currentTarget.style.background = '#f8f7f4' }}
                          onMouseLeave={e => { e.currentTarget.style.background = reqIds.includes(r.req_id) ? '#F0F7FF' : '#fff' }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${reqIds.includes(r.req_id) ? '#185FA5' : '#ccc'}`, background: reqIds.includes(r.req_id) ? '#185FA5' : '#fff', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {reqIds.includes(r.req_id) && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: '#185FA5' }}>{r.req_id}</div>
                            <div style={{ fontSize: 10, color: '#5F5E5A', lineHeight: 1.4 }}>{r.text.slice(0, 80)}{r.text.length > 80 ? '…' : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
                {allReqs.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: '#9b9991', fontStyle: 'italic' }}>No requirements found.</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Notes row */}
      <Cell value={notes} onSave={onSaveNotes} placeholder="Additional notes…" />
    </div>
  )
}


// ── Main page ──────────────────────────────────────────────
const TABS = ['Document Info', 'RM Team', 'Annex A', 'Risk Criteria']

export default function FmeaPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [fmea, setFmea] = useState<FmeaDoc | null>(null)
  const [revisions, setRevisions] = useState<RevRow[]>([])
  const [rmTeam, setRmTeam] = useState<RmRow[]>([])
  const [criteria, setCriteria] = useState<Criteria | null>(null)
  const [questions, setQuestions] = useState<AnnexQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnnexAnswer>>({})
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [activeTab, setActiveTab] = useState('Document Info')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
  const [reqLists, setReqLists] = useState<ReqListFull[]>([])

  // Column widths for FMEA table (per sheet, keyed by sheetId)
  const [colWidths, setColWidths] = useState<number[]>([
    70, 120, 160, 160, 160, 50, 50, 65, 100, 220, 65, 65, 80, 120, 140, 160, 160, 110, 40
  ])
  const resizingCol = React.useRef<number | null>(null)
  const resizingStartX = React.useRef<number>(0)
  const resizingStartW = React.useRef<number>(0)

  function startResize(e: React.MouseEvent, colIdx: number) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[colIdx]
    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX
      const newW = Math.max(40, startW + delta)
      setColWidths(prev => { const next = [...prev]; next[colIdx] = newW; return next })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // New sheet modal
  const [showNewSheet, setShowNewSheet] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')
  const [newSheetPrefix, setNewSheetPrefix] = useState('')
  const [addingSheet, setAddingSheet] = useState(false)

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/fmea`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    if (!data.fmea) { setLoading(false); return }
    setFmea(data.fmea)
    setRevisions(data.revisions || [])
    setRmTeam(data.rmTeam || [])
    setCriteria(data.criteria || null)
    setSheets(data.sheets || [])
    if (data.sheets?.length > 0 && !activeSheetId) setActiveSheetId(data.sheets[0].id)
    // index answers by question_id
    const answerMap: Record<string, AnnexAnswer> = {}
    for (const a of (data.annexAnswers || [])) answerMap[a.question_id] = a
    setAnswers(answerMap)
    setQuestions(data.annexQuestions || [])
    setLoading(false)
  }

  async function loadReqLists() {
    const res = await fetch(`/api/projects/${projectId}/requirements`)
    if (res.ok) { const d = await res.json(); setReqLists(d.lists || []) }
  }

  useEffect(() => { load(); loadReqLists() }, [projectId])

  async function createFmea() {
    setCreating(true)
    const res = await fetch(`/api/projects/${projectId}/fmea`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) { await load() }
    setCreating(false)
  }

  // ── Patch helpers ──
  async function patchDoc(fields: Record<string, any>) {
    if (!fmea) return
    setFmea(f => f ? { ...f, ...fields } : f)
    await fetch(`/api/projects/${projectId}/fmea/${fmea.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  }

  async function patchRevRow(id: string, field: string, value: string) {
    setRevisions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/revision-history`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value }),
    })
  }

  async function addRevRow() {
    const res = await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/revision-history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: '', issue_date: null, description: '', author: '' }),
    })
    if (res.ok) { const row = await res.json(); setRevisions(p => [...p, row]) }
  }

  async function deleteRevRow(id: string) {
    setRevisions(p => p.filter(r => r.id !== id))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/revision-history?rowId=${id}`, { method: 'DELETE' })
  }

  async function patchRmRow(id: string, field: string, value: string) {
    setRmTeam(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rm-team`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value }),
    })
  }

  async function addRmRow() {
    const res = await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rm-team`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no: rmTeam.length + 1, name: '', role: '', organisation: '', knowledge: '' }),
    })
    if (res.ok) { const row = await res.json(); setRmTeam(p => [...p, row]) }
  }

  async function deleteRmRow(id: string) {
    setRmTeam(p => p.filter(r => r.id !== id))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rm-team?rowId=${id}`, { method: 'DELETE' })
  }

  async function patchCriteria(fields: Record<string, number>) {
    setCriteria(c => c ? { ...c, ...fields } : c)
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/criteria`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  }

  async function patchAnnexAnswer(questionId: string, field: string, value: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { id: '', question_id: questionId, answer: '', input_to_ra: '', risk_ids: '' }), [field]: value }
    }))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/annex-answers`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, field, value }),
    })
  }

  async function addSheet() {
    if (!newSheetName.trim() || !newSheetPrefix.trim()) return
    setAddingSheet(true)
    const res = await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/sheets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSheetName.trim(), prefix: newSheetPrefix.trim() }),
    })
    if (res.ok) {
      const sheet = await res.json()
      setSheets(p => [...p, sheet])
      setActiveSheetId(sheet.id)
      setActiveTab(sheet.name)
      setNewSheetName(''); setNewSheetPrefix(''); setShowNewSheet(false)
    }
    setAddingSheet(false)
  }

  async function deleteSheet(sheetId: string) {
    if (!confirm('Delete this FMEA sheet and all its rows?')) return
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/sheets?sheetId=${sheetId}`, { method: 'DELETE' })
    const remaining = sheets.filter(s => s.id !== sheetId)
    setSheets(remaining)
    if (remaining.length > 0) { setActiveSheetId(remaining[0].id); setActiveTab(remaining[0].name) }
    else { setActiveSheetId(null); setActiveTab('Document Info') }
  }

  async function addFmeaRow(sheetId: string) {
    const res = await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rows`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_id: sheetId }),
    })
    if (res.ok) {
      const row = await res.json()
      if (!row.mitigation_req_ids) row.mitigation_req_ids = []
      setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, rows: [...s.rows, row] } : s))
    }
  }

  async function patchFmeaRow(sheetId: string, rowId: string, field: string, value: any) {
    setSheets(prev => prev.map(s => s.id === sheetId
      ? { ...s, rows: s.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r) }
      : s
    ))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rows`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rowId, field, value }),
    })
  }

  async function deleteFmeaRow(sheetId: string, rowId: string) {
    if (!confirm('Delete this row?')) return
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, rows: s.rows.filter(r => r.id !== rowId) } : s))
    await fetch(`/api/projects/${projectId}/fmea/${fmea!.id}/rows?rowId=${rowId}`, { method: 'DELETE' })
  }

  // ── Render helpers ──
  const headerCell = (label: string, width?: number) => (
    <th style={{
      padding: '7px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600,
      color: '#5F5E5A', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)',
      borderRight: '0.5px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' as const,
      ...(width ? { width, minWidth: width } : {}),
    }}>{label}</th>
  )

  // Resizable header cell for FMEA table
  const rHeaderCell = (label: string, colIdx: number) => (
    <th key={colIdx} style={{
      padding: '7px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600,
      color: '#5F5E5A', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)',
      whiteSpace: 'nowrap' as const, position: 'relative' as const,
      width: colWidths[colIdx], minWidth: 40, userSelect: 'none' as const,
    }}>
      {label}
      <div
        onMouseDown={e => startResize(e, colIdx)}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
          cursor: 'col-resize', zIndex: 1,
          background: 'transparent',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(24,95,165,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      />
    </th>
  )

  const tdStyle = (highlight?: boolean): React.CSSProperties => ({
    padding: '6px 8px', verticalAlign: 'top',
    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
    borderRight: '0.5px solid rgba(0,0,0,0.04)',
    background: highlight ? 'rgba(24,95,165,0.03)' : '#fff',
  })


  async function exportToExcel() {
    if (!fmea) return
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = fmea.prepared_by || 'TFBuilder'
    wb.created = new Date()

    // ── helpers ──
    const GRAY_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9D9D9' } }
    const BLUE_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFB8CCE4' } }
    const LIGHT_BLUE_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCE6F1' } }
    const GREEN_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEAF3DE' } }
    const YELLOW_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFBCC' } }
    const RED_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFCEBEB' } }
    const HEADER_FONT = { bold: true, size: 11 }
    const THIN_BORDER = {
      top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
      left: { style: 'thin' as const }, right: { style: 'thin' as const }
    }
    function applyBorder(cell: any) { cell.border = THIN_BORDER }
    function applyBorderRange(ws: any, r1: number, c1: number, r2: number, c2: number) {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) applyBorder(ws.getCell(r, c))
    }

    // ══════════════════════════════════════════
    // SHEET 1: Document Info
    // ══════════════════════════════════════════
    const ws1 = wb.addWorksheet('Document Info')
    ws1.columns = [
      {width:18},{width:30},{width:14},{width:14},{width:30},{width:10},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14}
    ]

    // Row 1: Title
    ws1.mergeCells('A1:Q1')
    const titleCell = ws1.getCell('A1')
    titleCell.value = 'Risk Analysis'
    titleCell.font = { bold: true, size: 18 }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = GRAY_FILL
    ws1.getRow(1).height = 36
    applyBorderRange(ws1, 1, 1, 1, 17)

    // Row 2: Product + Record ID
    ws1.mergeCells('A2:B2')
    ws1.getCell('A2').value = 'Product'
    ws1.getCell('A2').font = HEADER_FONT
    ws1.getCell('A2').fill = GRAY_FILL
    ws1.mergeCells('C2:E2')
    ws1.getCell('C2').value = fmea.title
    ws1.getCell('F2').value = 'Record ID:'
    ws1.getCell('F2').font = HEADER_FONT
    ws1.getCell('F2').fill = GRAY_FILL
    ws1.mergeCells('G2:Q2')
    ws1.getCell('G2').value = fmea.record_id
    applyBorderRange(ws1, 2, 1, 2, 17)

    // Row 3: Form code + Revision + Date
    ws1.mergeCells('A3:B3')
    ws1.getCell('A3').value = 'Form code:'
    ws1.getCell('A3').font = HEADER_FONT
    ws1.getCell('A3').fill = GRAY_FILL
    ws1.mergeCells('C3:E3')
    ws1.getCell('C3').value = fmea.form_code
    ws1.getCell('F3').value = 'Revision'
    ws1.getCell('F3').font = HEADER_FONT
    ws1.getCell('F3').fill = GRAY_FILL
    ws1.mergeCells('G3:L3')
    ws1.getCell('G3').value = fmea.revision
    ws1.getCell('M3').value = 'Date'
    ws1.getCell('M3').font = HEADER_FONT
    ws1.getCell('M3').fill = GRAY_FILL
    ws1.mergeCells('N3:Q3')
    ws1.getCell('N3').value = fmea.doc_date?.split('T')[0] || ''
    applyBorderRange(ws1, 3, 1, 3, 17)

    // Row 4: Prepared by
    ws1.mergeCells('A4:B4')
    ws1.getCell('A4').value = 'Analysis prepared by'
    ws1.getCell('A4').font = HEADER_FONT
    ws1.getCell('A4').fill = GRAY_FILL
    ws1.mergeCells('C4:K4')
    ws1.getCell('C4').value = fmea.prepared_by
    ws1.mergeCells('L4:M4')
    ws1.getCell('L4').value = 'Signature'
    ws1.getCell('L4').font = HEADER_FONT
    ws1.getCell('L4').fill = GRAY_FILL
    ws1.mergeCells('N4:Q4')
    ws1.getRow(4).height = 28
    applyBorderRange(ws1, 4, 1, 4, 17)

    // Row 5: Approved by
    ws1.mergeCells('A5:B5')
    ws1.getCell('A5').value = 'Approved by:'
    ws1.getCell('A5').font = { bold: true, size: 11, italic: true }
    ws1.getCell('A5').fill = GRAY_FILL
    ws1.mergeCells('C5:K5')
    ws1.getCell('C5').value = fmea.approved_by
    ws1.mergeCells('L5:M5')
    ws1.getCell('L5').value = 'Signature'
    ws1.getCell('L5').font = HEADER_FONT
    ws1.getCell('L5').fill = GRAY_FILL
    ws1.mergeCells('N5:Q5')
    ws1.getRow(5).height = 28
    applyBorderRange(ws1, 5, 1, 5, 17)

    // Row 7: Revision history label
    ws1.getCell('A7').value = 'Revision history table:'
    ws1.getCell('A7').font = { size: 10 }

    // Row 9: Revision history headers
    const rhHeaders = ['Revision', 'Issue Date', 'Description', 'Author']
    const rhCols = ['A', 'B', 'C', 'G']
    const rhWidths = [['A9','A9'],['B9','B9'],['C9','F9'],['G9','Q9']]
    rhWidths.forEach(([s,e], idx) => {
      if (s !== e) ws1.mergeCells(`${s}:${e}`)
      const c = ws1.getCell(s)
      c.value = rhHeaders[idx]
      c.font = HEADER_FONT
      c.fill = GRAY_FILL
      c.alignment = { horizontal: 'center' }
      applyBorder(c)
    })
    ws1.getRow(9).height = 22

    // Revision history rows
    revisions.forEach((r: any, i: number) => {
      const row = 10 + i
      ws1.getCell(`A${row}`).value = r.revision
      ws1.getCell(`B${row}`).value = r.issue_date?.split('T')[0] || ''
      ws1.mergeCells(`C${row}:F${row}`)
      ws1.getCell(`C${row}`).value = r.description
      ws1.mergeCells(`G${row}:Q${row}`)
      ws1.getCell(`G${row}`).value = r.author
      applyBorderRange(ws1, row, 1, row, 17)
      ws1.getRow(row).height = 20
    })
    // Empty rows
    for (let i = revisions.length; i < 5; i++) {
      const row = 10 + i
      ws1.mergeCells(`C${row}:F${row}`)
      ws1.mergeCells(`G${row}:Q${row}`)
      applyBorderRange(ws1, row, 1, row, 17)
      ws1.getRow(row).height = 20
    }

    // ══════════════════════════════════════════
    // SHEET 2: RM Team
    // ══════════════════════════════════════════
    const ws2 = wb.addWorksheet('RM Team')
    ws2.columns = [{width:6},{width:28},{width:22},{width:22},{width:50}]

    // Title
    ws2.mergeCells('A1:E1')
    const rmTitle = ws2.getCell('A1')
    rmTitle.value = 'RISK MANAGEMENT TEAM'
    rmTitle.font = { bold: true, size: 13 }
    rmTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.getRow(1).height = 28
    applyBorderRange(ws2, 1, 1, 1, 5)

    // Headers
    const rmH = ['No', 'Name and Surname of Expert', 'Role', 'Organisation', 'Knowledge and experience']
    rmH.forEach((h, i) => {
      const cell = ws2.getCell(2, i+1)
      cell.value = h
      cell.font = HEADER_FONT
      cell.fill = GRAY_FILL
      cell.alignment = { horizontal: 'center', wrapText: true }
      applyBorder(cell)
    })
    ws2.getRow(2).height = 22

    // Data rows
    const rmRows = [...rmTeam]
    while (rmRows.length < 7) rmRows.push({ id: '', no: rmRows.length+1, name:'', role:'', organisation:'', knowledge:'', position: 0 } as RmRow)
    rmRows.forEach((r: any, i: number) => {
      const row = 3 + i
      const height = i >= 5 ? 60 : 20
      ;[i+1, r.name, r.role, r.organisation, r.knowledge].forEach((val, ci) => {
        const cell = ws2.getCell(row, ci+1)
        cell.value = val || ''
        cell.alignment = { wrapText: true, vertical: 'middle' }
        applyBorder(cell)
      })
      ws2.getRow(row).height = height
    })

    // ══════════════════════════════════════════
    // SHEET 3: Annex A
    // ══════════════════════════════════════════
    const ws3 = wb.addWorksheet('Annex A - Safety')
    ws3.columns = [{width:70},{width:40},{width:18},{width:16}]

    // Header row
    const annexHeaders = [
      'ISO/TR 24971:2020 - Annex A - Identification of hazards and characteristics related to safety',
      'Answer', 'Input to Risk Analysis? (yes/no)', 'RISK ID'
    ]
    const annexHeaderFills = [BLUE_FILL, {type:'pattern' as const, pattern:'solid' as const, fgColor:{argb:'FFF8F7F4'}}, BLUE_FILL, {type:'pattern' as const, pattern:'solid' as const, fgColor:{argb:'FFF8F7F4'}}]
    annexHeaders.forEach((h, i) => {
      const cell = ws3.getCell(1, i+1)
      cell.value = h
      cell.font = HEADER_FONT
      cell.fill = annexHeaderFills[i]
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
      applyBorder(cell)
    })
    ws3.getRow(1).height = 40

    // Question rows
    questions.forEach((q: any, i: number) => {
      const ans = answers[q.id] || { answer: '', input_to_ra: '', risk_ids: '' }
      const row = 2 + i
      const qCell = ws3.getCell(row, 1)
      qCell.value = `${q.code} — ${q.question}
${q.sub_bullets || ''}`
      qCell.font = { size: 10 }
      qCell.alignment = { wrapText: true, vertical: 'top' }
      qCell.fill = LIGHT_BLUE_FILL
      applyBorder(qCell)

      const aCell = ws3.getCell(row, 2)
      aCell.value = ans.answer
      aCell.alignment = { wrapText: true, vertical: 'top' }
      applyBorder(aCell)

      const iraCell = ws3.getCell(row, 3)
      iraCell.value = ans.input_to_ra
      iraCell.alignment = { horizontal: 'center', vertical: 'middle' }
      applyBorder(iraCell)

      const ridCell = ws3.getCell(row, 4)
      ridCell.value = ans.risk_ids
      ridCell.font = { name: 'Courier New', size: 10 }
      applyBorder(ridCell)

      ws3.getRow(row).height = 80
    })

    // ══════════════════════════════════════════
    // SHEET 4: Risk Criteria
    // ══════════════════════════════════════════
    if (criteria) {
      const ws4 = wb.addWorksheet('Risk Criteria')
      ws4.columns = [{width:16},{width:14},{width:14},{width:14},{width:14},{width:14},{width:2},{width:2},{width:2},{width:20},{width:40},{width:10}]

      // Matrix title area - diagonal header
      ws4.getCell('A1').value = 'Severity →'
      ws4.getCell('A1').font = { bold: true, size: 10 }
      ws4.getCell('A2').value = 'Probability ↓'
      ws4.getCell('A2').font = { bold: true, size: 10 }
      applyBorder(ws4.getCell('A1'))
      applyBorder(ws4.getCell('A2'))

      // Severity headers row 1
      const sevLabels = ['Negligible (1)', 'Minor (2)', 'Serious (3)', 'Critical (4)', 'Catastrophic (5)']
      sevLabels.forEach((s, i) => {
        const cell = ws4.getCell(1, i+2)
        cell.value = s
        cell.font = HEADER_FONT
        cell.fill = GRAY_FILL
        cell.alignment = { horizontal: 'center', wrapText: true }
        applyBorder(cell)
      })
      ws4.getRow(1).height = 30

      // Probability rows
      const probRows = [['Frequent',5],['Probable',4],['Occasional',3],['Remote',2],['Improbable',1]] as [string,number][]
      probRows.forEach(([label, prob], pi) => {
        const row = pi + 2
        const labelCell = ws4.getCell(row, 1)
        labelCell.value = `${label}
${prob}`
        labelCell.font = HEADER_FONT
        labelCell.fill = GRAY_FILL
        labelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        applyBorder(labelCell)
        ws4.getRow(row).height = 28

        for (let si = 0; si < 5; si++) {
          const sev = si + 1
          const rpn = prob * sev
          const rClass = rpn <= criteria.r1_max ? 'R1' : rpn <= criteria.r2_max ? 'R2' : 'R3'
          const fill = rClass === 'R1' ? GREEN_FILL : rClass === 'R2' ? YELLOW_FILL : RED_FILL
          const color = rClass === 'R1' ? 'FF27500A' : rClass === 'R2' ? 'FF7A6500' : 'FFA32D2D'
          const cell = ws4.getCell(row, si+2)
          cell.value = rClass
          cell.font = { bold: true, size: 12, color: { argb: color } }
          cell.fill = fill
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          applyBorder(cell)
        }
      })

      // Note text
      ws4.mergeCells('A8:F8')
      ws4.getCell('A8').value = 'Additional risk control measures shall be implemented to reduce the risk to R1 level. If no measures are practicable or if the risk value remains within the R2 level, a risk-benefit analysis must be performed and documented in the risk management report.'
      ws4.getCell('A8').alignment = { wrapText: true, vertical: 'middle' }
      ws4.getCell('A8').font = { size: 9 }
      ws4.getRow(8).height = 40

      // Acceptance table
      const accHeaders = ['Risk Class', 'Risk level', 'Range', 'Acceptance Criteria']
      accHeaders.forEach((h, i) => {
        const cell = ws4.getCell(9, i+1)
        cell.value = h
        cell.font = HEADER_FONT
        cell.fill = BLUE_FILL
        cell.alignment = { horizontal: 'center' }
        applyBorder(cell)
      })
      const accRows = [
        { cls: 'R1', level: 'Low Risk Level', range: `${criteria.r1_min}-${criteria.r1_max}`, criteria: 'Acceptable', fill: GREEN_FILL, color: 'FF27500A' },
        { cls: 'R2', level: 'Medium Risk Level', range: `${criteria.r2_min}-${criteria.r2_max}`, criteria: 'Risk reduction actions required', fill: YELLOW_FILL, color: 'FF7A6500' },
        { cls: 'R3', level: 'High Risk Level', range: `${criteria.r3_min}-${criteria.r3_max}`, criteria: 'Not acceptable Risk', fill: RED_FILL, color: 'FFA32D2D' },
      ]
      accRows.forEach((ar, i) => {
        const row = 10 + i
        const clsCell = ws4.getCell(row, 1)
        clsCell.value = ar.cls
        clsCell.font = { bold: true, size: 12, color: { argb: ar.color } }
        clsCell.fill = ar.fill
        clsCell.alignment = { horizontal: 'center', vertical: 'middle' }
        applyBorder(clsCell)
        ;[ar.level, ar.range, ar.criteria].forEach((val, ci) => {
          const cell = ws4.getCell(row, ci+2)
          cell.value = val
          if (ci === 1) { cell.font = { bold: true, color: { argb: ar.color } }; cell.alignment = { horizontal: 'center' } }
          applyBorder(cell)
        })
        ws4.getRow(row).height = 22
      })

      // Severity definition table (right side)
      const sevDefHeaders = ['SEVERITY', 'Definition', 'Value']
      sevDefHeaders.forEach((h, i) => {
        const cell = ws4.getCell(1, i+10)
        cell.value = h
        cell.font = HEADER_FONT
        cell.fill = GRAY_FILL
        cell.alignment = { horizontal: 'center' }
        applyBorder(cell)
      })
      const sevDefs = [
        ['Catastrophic', 'Serious injury (irreversible) of the patient or user', 5],
        ['Critical', 'Serious injury (reversible) to the patient or user.', 4],
        ['Serious', 'Moderate injury to the patient or user or moderate negative effect on the environment.', 3],
        ['Minor', 'Minor injury to the patient or user or minor negative effect on the environment.', 2],
        ['Negligible', 'No injury to the patient or user. Possible little damage to the device/system.', 1],
      ]
      sevDefs.forEach(([name, def, val], i) => {
        const row = 2 + i
        ws4.getCell(row, 10).value = name; ws4.getCell(row, 10).font = { bold: true }; applyBorder(ws4.getCell(row, 10))
        ws4.getCell(row, 11).value = def; ws4.getCell(row, 11).alignment = { wrapText: true }; applyBorder(ws4.getCell(row, 11))
        ws4.getCell(row, 12).value = val; ws4.getCell(row, 12).alignment = { horizontal: 'center' }; ws4.getCell(row, 12).font = { bold: true }; applyBorder(ws4.getCell(row, 12))
        ws4.getRow(row).height = 28
      })

      // Probability definition table (right side)
      sevDefHeaders.forEach((h, i) => {
        const cell = ws4.getCell(8, i+10)
        cell.value = i === 0 ? 'Probability' : h
        cell.font = HEADER_FONT
        cell.fill = GRAY_FILL
        cell.alignment = { horizontal: 'center' }
        applyBorder(cell)
      })
      const probDefs = [
        ['Frequent', 'Above 1 in 10 (10%)', 5],
        ['Probable', '1 in 100 < F ≤ 1 in 10 (1% to 10%)', 4],
        ['Occasional', '1 in 1,000 < F ≤ 1 in 100', 3],
        ['Remote', '1 in 10,000 ≤ F ≤ 1 in 1,000', 2],
        ['Improbable', 'F ≤ 1 in 10,000', 1],
      ]
      probDefs.forEach(([name, def, val], i) => {
        const row = 9 + i
        ws4.getCell(row, 10).value = name; ws4.getCell(row, 10).font = { bold: true }; applyBorder(ws4.getCell(row, 10))
        ws4.getCell(row, 11).value = def; ws4.getCell(row, 11).alignment = { wrapText: true }; applyBorder(ws4.getCell(row, 11))
        ws4.getCell(row, 12).value = val; ws4.getCell(row, 12).alignment = { horizontal: 'center' }; ws4.getCell(row, 12).font = { bold: true }; applyBorder(ws4.getCell(row, 12))
        ws4.getRow(row).height = 22
      })
    }

    // ══════════════════════════════════════════
    // FMEA sheets
    // ══════════════════════════════════════════
    for (const sheet of sheets) {
      const ws = wb.addWorksheet(sheet.name.slice(0, 31))
      ws.columns = [
        {width:10},{width:14},{width:24},{width:24},{width:24},
        {width:7},{width:7},{width:9},{width:14},
        {width:36},
        {width:9},{width:9},{width:12},{width:16},
        {width:22},{width:24},{width:24},{width:20},{width:6}
      ]

      // Row 1: section titles
      ws.mergeCells('A1:I1')
      ws.getCell('A1').value = `Hazards related to ${sheet.name}`
      ws.getCell('A1').font = { bold: true, size: 12 }
      ws.getCell('A1').fill = BLUE_FILL
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
      applyBorderRange(ws, 1, 1, 1, 9)

      ws.mergeCells('J1:N1')
      ws.getCell('J1').value = 'Residual Risk'
      ws.getCell('J1').font = { bold: true, size: 12 }
      ws.getCell('J1').fill = GRAY_FILL
      ws.getCell('J1').alignment = { horizontal: 'center', vertical: 'middle' }
      applyBorderRange(ws, 1, 10, 1, 14)

      ws.mergeCells('O1:R1')
      ws.getCell('O1').value = 'Evaluation of Overall Residual Risk Acceptability'
      ws.getCell('O1').font = { bold: true, size: 10 }
      ws.getCell('O1').fill = GREEN_FILL
      ws.getCell('O1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      applyBorderRange(ws, 1, 15, 1, 18)
      ws.getRow(1).height = 30

      // Row 2: column headers
      const fmeaHeaders = [
        'HAZARD No','Hazard','Foreseeable sequence of events (cause)','Hazardous situation','Harm to patient / user',
        'Probability of Occurrence','Severity','Risk estimation','Risk Level',
        'Risk Mitigation measure',
        'Probability of Occurrence','Severity','Mitigated risk estimation','Residual Risk Review Level',
        'Related verification Document',
        'Residual Hazard (Yes/No) + Rationale','Benefit / Residual Risk Analysis','Do risk control parameters cause new hazards or risks?'
      ]
      fmeaHeaders.forEach((h, i) => {
        const cell = ws.getCell(2, i+1)
        cell.value = h
        cell.font = { bold: true, size: 9 }
        cell.fill = i < 9 ? BLUE_FILL : i < 14 ? GRAY_FILL : GREEN_FILL
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        applyBorder(cell)
      })
      ws.getRow(2).height = 50
      ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }]

      // Data rows
      sheet.rows.forEach((row: any, i: number) => {
        const re = (row.probability && row.severity) ? row.probability * row.severity : null
        const rre = (row.residual_probability && row.residual_severity) ? row.residual_probability * row.residual_severity : null
        const rl = re && criteria ? (re <= criteria.r1_max ? 'LOW RISK' : re <= criteria.r2_max ? 'MEDIUM RISK' : 'HIGH RISK') : ''
        const rrl = rre && criteria ? (rre <= criteria.r1_max ? 'LOW RISK' : rre <= criteria.r2_max ? 'MEDIUM RISK' : 'HIGH RISK') : ''
        const rlFill = re && criteria ? (re <= criteria.r1_max ? GREEN_FILL : re <= criteria.r2_max ? YELLOW_FILL : RED_FILL) : { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } }
        const rrlFill = rre && criteria ? (rre <= criteria.r1_max ? GREEN_FILL : rre <= criteria.r2_max ? YELLOW_FILL : RED_FILL) : { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } }

        const dataRow = 3 + i
        const vals = [
          `${sheet.prefix}-${String(i+1).padStart(2,'0')}`,
          row.hazard, row.sequence_of_events, row.hazardous_situation, row.harm,
          row.probability, row.severity, re, rl,
          [(row.mitigation_req_ids||[]).map((rid: string) => {
            let text = ''
            for (const l of reqLists) { for (const g of l.groups) { const f = g.reqs.find((r: any) => r.req_id === rid); if (f) { text = f.text; break } } if (text) break }
            return text ? `${rid}: ${text}` : rid
          }).join('\n'), row.mitigation].filter(Boolean).join('\n'),
          row.residual_probability, row.residual_severity, rre, rrl,
          row.verification_document, row.residual_hazard, row.benefit_analysis, row.new_hazards
        ]
        vals.forEach((val, ci) => {
          const cell = ws.getCell(dataRow, ci+1)
          cell.value = val ?? ''
          cell.alignment = { wrapText: true, vertical: 'top' }
          applyBorder(cell)
          // Color risk level cells
          if (ci === 8) { cell.fill = rlFill; cell.font = { bold: true, size: 9 }; cell.alignment = { horizontal: 'center', vertical: 'middle' } }
          if (ci === 13) { cell.fill = rrlFill; cell.font = { bold: true, size: 9 }; cell.alignment = { horizontal: 'center', vertical: 'middle' } }
          if (ci === 7 || ci === 12) { cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' } }
          if (ci === 0) { cell.font = { bold: true, color: { argb: 'FF185FA5' } }; cell.alignment = { horizontal: 'center', vertical: 'middle' } }
        })
        ws.getRow(dataRow).height = 60
      })
    }

    // Download
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Risk_Analysis_${(fmea.title || 'document').replace(/[^a-zA-Z0-9]/g,'_')}_${fmea.revision}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  )

  // ── No FMEA yet ──
  if (!fmea) return (
    <div>
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>Project</Link>
        <span>›</span><span style={{ color: '#1a1a18' }}>Risk Analysis (FMEA)</span>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No Risk Analysis document yet</div>
        <div style={{ fontSize: 13, color: '#6b6a64', marginBottom: 24 }}>Create one to start the FMEA process for this project.</div>
        <button onClick={createFmea} disabled={creating}
          style={{ height: 36, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
          {creating ? 'Creating…' : 'Create Risk Analysis'}
        </button>
      </div>
    </div>
  )

  const allTabs = [...TABS, ...sheets.map(s => s.name)]
  const activeSheet = sheets.find(s => s.id === activeSheetId) || null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>Project</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>Risk Analysis (FMEA)</span>
      </div>

      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={exportToExcel}
          style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#EAF3DE', border: '0.5px solid #97C459', borderRadius: 8, color: '#27500A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export to Excel
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, borderBottom: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' as const }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: activeTab === tab ? 500 : 400,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #185FA5' : '2px solid transparent',
              color: activeTab === tab ? '#185FA5' : '#6b6a64', whiteSpace: 'nowrap' as const,
            }}>{tab}</button>
        ))}

        {/* FMEA sheet tabs */}
        {sheets.map(sheet => (
          <button key={sheet.id}
            onClick={() => { setActiveTab(sheet.name); setActiveSheetId(sheet.id) }}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: activeTab === sheet.name ? 500 : 400,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === sheet.name ? '2px solid #185FA5' : '2px solid transparent',
              color: activeTab === sheet.name ? '#185FA5' : '#6b6a64', whiteSpace: 'nowrap' as const,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span style={{ fontSize: 10, color: '#9b9991', fontFamily: 'monospace' }}>[{sheet.prefix}]</span>
            {sheet.name}
          </button>
        ))}

        {/* Add sheet */}
        <button onClick={() => setShowNewSheet(true)}
          style={{ padding: '8px 12px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#185FA5', whiteSpace: 'nowrap' as const }}>
          + Add sheet
        </button>
      </div>

      {/* ══ Document Info ══ */}
      {activeTab === 'Document Info' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
          {/* Header card */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#d9d9d9', padding: '14px 20px', textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>
              {fmea.title}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              {/* Left col */}
              <div style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Product</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.title} onSave={v => patchDoc({ title: v })} placeholder="Product / document title" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Form code</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.form_code} onSave={v => patchDoc({ form_code: v })} placeholder="e.g. F7.70023" mono />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Analysis prepared by</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.prepared_by} onSave={v => patchDoc({ prepared_by: v })} placeholder="Name" />
                  </div>
                </div>
              </div>
              {/* Right col */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Record ID</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.record_id} onSave={v => patchDoc({ record_id: v })} placeholder="e.g. RA-240315-01" mono />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 1fr', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Revision</div>
                  <div style={{ padding: '9px 12px', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <Cell value={fmea.revision} onSave={v => patchDoc({ revision: v })} placeholder="1.0" mono />
                  </div>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Date</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.doc_date ? fmea.doc_date.split('T')[0] : ''} onSave={v => patchDoc({ doc_date: v })} placeholder="DD.MM.YYYY" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr' }}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: '#5F5E5A', fontWeight: 500, background: '#fafaf8', borderRight: '0.5px solid rgba(0,0,0,0.07)' }}>Approved by</div>
                  <div style={{ padding: '9px 12px' }}>
                    <Cell value={fmea.approved_by} onSave={v => patchDoc({ approved_by: v })} placeholder="Name" />
                  </div>
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
                {headerCell('Revision', 80)}{headerCell('Issue Date', 110)}{headerCell('Description')}{headerCell('Author', 160)}{headerCell('', 40)}
              </tr></thead>
              <tbody>
                {revisions.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle()}><Cell value={r.revision} onSave={v => patchRevRow(r.id, 'revision', v)} placeholder="1.0" mono /></td>
                    <td style={tdStyle()}><Cell value={r.issue_date ? r.issue_date.split('T')[0] : ''} onSave={v => patchRevRow(r.id, 'issue_date', v)} placeholder="YYYY-MM-DD" /></td>
                    <td style={tdStyle()}><Cell value={r.description} onSave={v => patchRevRow(r.id, 'description', v)} placeholder="Description…" /></td>
                    <td style={tdStyle()}><Cell value={r.author} onSave={v => patchRevRow(r.id, 'author', v)} placeholder="Author name" /></td>
                    <td style={tdStyle()}>
                      <button onClick={() => deleteRevRow(r.id)} style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </td>
                  </tr>
                ))}
                {revisions.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9b9991', fontSize: 12 }}>No revision history. Click "+ Add row".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ RM Team ══ */}
      {activeTab === 'RM Team' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em' }}>RISK MANAGEMENT TEAM</div>
            <button onClick={addRmRow} style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>+ Add member</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {headerCell('No', 40)}{headerCell('Name and Surname of Expert', 200)}{headerCell('Role', 160)}{headerCell('Organisation', 160)}{headerCell('Knowledge and experience')}{headerCell('', 40)}
            </tr></thead>
            <tbody>
              {rmTeam.map((r, i) => (
                <tr key={r.id}>
                  <td style={tdStyle()}><div style={{ fontSize: 11, color: '#9b9991', textAlign: 'center' }}>{i + 1}</div></td>
                  <td style={tdStyle()}><Cell value={r.name} onSave={v => patchRmRow(r.id, 'name', v)} placeholder="Full name" /></td>
                  <td style={tdStyle()}><Cell value={r.role} onSave={v => patchRmRow(r.id, 'role', v)} placeholder="Role" /></td>
                  <td style={tdStyle()}><Cell value={r.organisation} onSave={v => patchRmRow(r.id, 'organisation', v)} placeholder="Organisation" /></td>
                  <td style={tdStyle()}><Cell value={r.knowledge} onSave={v => patchRmRow(r.id, 'knowledge', v)} placeholder="Knowledge and experience" /></td>
                  <td style={tdStyle()}>
                    <button onClick={() => deleteRmRow(r.id)} style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </td>
                </tr>
              ))}
              {rmTeam.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9b9991', fontSize: 12 }}>No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ Annex A ══ */}
      {activeTab === 'Annex A' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>ISO/TR 24971:2020 — Annex A</div>
            <div style={{ fontSize: 11, color: '#6b6a64', marginTop: 2 }}>Identification of hazards and characteristics related to safety</div>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ width: 460, padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#B8CCE4', borderBottom: '1px solid rgba(0,0,0,0.1)', borderRight: '0.5px solid rgba(0,0,0,0.1)' }}>
                  ISO/TR 24971:2020 — Annex A — Identification of hazards and characteristics related to safety
                </th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)', borderRight: '0.5px solid rgba(0,0,0,0.1)' }}>Answer</th>
                <th style={{ width: 120, padding: '7px 12px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#B8CCE4', borderBottom: '1px solid rgba(0,0,0,0.1)', borderRight: '0.5px solid rgba(0,0,0,0.1)' }}>Input to Risk Analysis? (yes/no)</th>
                <th style={{ width: 100, padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>RISK ID</th>
              </tr></thead>
              <tbody>
                {questions.map(q => {
                  const ans = answers[q.id] || { answer: '', input_to_ra: '', risk_ids: '' }
                  return (
                    <tr key={q.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', background: '#EEF4FA', borderRight: '0.5px solid rgba(0,0,0,0.08)', maxWidth: 460 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>{q.code} — {q.question}</div>
                        {q.sub_bullets && (
                          <div style={{ fontSize: 11, color: '#5F5E5A', lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>{q.sub_bullets}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', borderRight: '0.5px solid rgba(0,0,0,0.06)', minWidth: 200 }}>
                        <Cell value={ans.answer} onSave={v => patchAnnexAnswer(q.id, 'answer', v)} placeholder="Enter answer…" />
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'center', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <select value={ans.input_to_ra || ''}
                          onChange={e => patchAnnexAnswer(q.id, 'input_to_ra', e.target.value)}
                          style={{ fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, padding: '3px 6px', background: '#fff', cursor: 'pointer' }}>
                          <option value="">—</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <Cell value={ans.risk_ids} onSave={v => patchAnnexAnswer(q.id, 'risk_ids', v)} placeholder="e.g. RP-01" mono />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Risk Criteria ══ */}
      {activeTab === 'Risk Criteria' && criteria && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Left — matrix + legend */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
            {/* 5x5 matrix */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 12, fontWeight: 500 }}>Risk Matrix</div>
              <div style={{ padding: 16, overflowX: 'auto' as const }}>
                <table style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <td style={{ width: 100 }} />
                      <th style={{ padding: '6px 10px', fontSize: 11, textAlign: 'center', color: '#5F5E5A' }}>Negligible<br />(1)</th>
                      <th style={{ padding: '6px 10px', fontSize: 11, textAlign: 'center', color: '#5F5E5A' }}>Minor<br />(2)</th>
                      <th style={{ padding: '6px 10px', fontSize: 11, textAlign: 'center', color: '#5F5E5A' }}>Serious<br />(3)</th>
                      <th style={{ padding: '6px 10px', fontSize: 11, textAlign: 'center', color: '#5F5E5A' }}>Critical<br />(4)</th>
                      <th style={{ padding: '6px 10px', fontSize: 11, textAlign: 'center', color: '#5F5E5A' }}>Catastrophic<br />(5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Frequent', val: 5 },
                      { label: 'Probable', val: 4 },
                      { label: 'Occasional', val: 3 },
                      { label: 'Remote', val: 2 },
                      { label: 'Improbable', val: 1 },
                    ].map(prob => (
                      <tr key={prob.val}>
                        <td style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, color: '#5F5E5A', whiteSpace: 'nowrap' as const }}>
                          {prob.label}<br /><span style={{ fontSize: 10, color: '#9b9991' }}>{prob.val}</span>
                        </td>
                        {[1, 2, 3, 4, 5].map(sev => {
                          const rpn = prob.val * sev
                          const rl = getRiskLevel(rpn, criteria)
                          const label = rpn <= criteria.r1_max ? 'R1' : rpn <= criteria.r2_max ? 'R2' : 'R3'
                          return (
                            <td key={sev} style={{ padding: '10px 14px', textAlign: 'center', background: rl.bg, border: '1px solid rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12, color: rl.color }}>
                              {label}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acceptance table */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 12, fontWeight: 500 }}>Risk Acceptance Criteria</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Risk Class', 'Risk Level', 'Range', 'Acceptance Criteria'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#B8CCE4', borderBottom: '1px solid rgba(0,0,0,0.1)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', background: '#EAF3DE', fontWeight: 700, color: '#27500A', textAlign: 'center' }}>R1</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>Low Risk Level</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'monospace' }}>{criteria.r1_min}–{criteria.r1_max}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>Acceptable</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', background: '#FFFBCC', fontWeight: 700, color: '#7A6500', textAlign: 'center' }}>R2</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>Medium Risk Level</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'monospace' }}>{criteria.r2_min}–{criteria.r2_max}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>Risk reduction required</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', background: '#FCEBEB', fontWeight: 700, color: '#A32D2D', textAlign: 'center' }}>R3</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>High Risk Level</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'monospace' }}>{criteria.r3_min}–{criteria.r3_max}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>Not acceptable</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right — definitions + edit thresholds */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
            {/* Severity definitions */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 12, fontWeight: 500 }}>Severity Definitions</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Severity</th>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Definition</th>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', width: 50 }}>Value</th>
                </tr></thead>
                <tbody>
                  {[
                    { name: 'Catastrophic', def: 'Serious injury (irreversible) of the patient or user', val: 5 },
                    { name: 'Critical', def: 'Serious injury (reversible) to the patient or user.', val: 4 },
                    { name: 'Serious', def: 'Moderate injury to the patient or user or moderate negative effect on the environment.', val: 3 },
                    { name: 'Minor', def: 'Minor injury to the patient or user or minor negative effect on the environment.', val: 2 },
                    { name: 'Negligible', def: 'No injury to the patient or user. Possible little damage to the device/system.', val: 1 },
                  ].map(s => (
                    <tr key={s.val} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: '#5F5E5A' }}>{s.def}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{s.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Probability definitions */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 12, fontWeight: 500 }}>Probability Definitions</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Probability</th>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Definition</th>
                  <th style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#5F5E5A', background: '#d9d9d9', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', width: 50 }}>Value</th>
                </tr></thead>
                <tbody>
                  {[
                    { name: 'Frequent', def: 'Above 1 in 10 (10%)', val: 5 },
                    { name: 'Probable', def: '1 in 100 < F ≤ 1 in 10 (1% to 10%)', val: 4 },
                    { name: 'Occasional', def: '1 in 1,000 < F ≤ 1 in 100', val: 3 },
                    { name: 'Remote', def: '1 in 10,000 ≤ F ≤ 1 in 1,000', val: 2 },
                    { name: 'Improbable', def: 'F ≤ 1 in 10,000', val: 1 },
                  ].map(p => (
                    <tr key={p.val} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: '#5F5E5A' }}>{p.def}</td>
                      <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{p.val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Editable thresholds */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>Risk Thresholds (editable)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'R1 max (Low)', field: 'r1_max', value: criteria.r1_max, bg: '#EAF3DE', color: '#27500A' },
                  { label: 'R2 max (Medium)', field: 'r2_max', value: criteria.r2_max, bg: '#FFFBCC', color: '#7A6500' },
                  { label: 'R3 max (High)', field: 'r3_max', value: criteria.r3_max, bg: '#FCEBEB', color: '#A32D2D' },
                ].map(t => (
                  <div key={t.field} style={{ background: t.bg, border: `0.5px solid ${t.color}33`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: t.color, fontWeight: 600, marginBottom: 6 }}>{t.label}</div>
                    <input type="number" min={1} max={25} value={t.value}
                      onChange={e => {
                        const v = parseInt(e.target.value)
                        if (isNaN(v)) return
                        const updates: Record<string, number> = { [t.field]: v }
                        if (t.field === 'r1_max') { updates.r1_min = 1; updates.r2_min = v + 1 }
                        if (t.field === 'r2_max') { updates.r2_min = criteria.r1_max + 1; updates.r3_min = v + 1 }
                        patchCriteria(updates)
                      }}
                      style={{ width: 60, textAlign: 'center', fontSize: 16, fontWeight: 700, color: t.color, background: 'transparent', border: `1px solid ${t.color}44`, borderRadius: 6, padding: '4px 0' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#9b9991', marginTop: 10 }}>
                Changing thresholds updates the risk matrix and all FMEA color coding automatically.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FMEA Sheet ══ */}
      {activeSheet && activeTab === activeSheet.name && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Hazards related to {activeSheet.name}</div>
              <div style={{ fontSize: 11, color: '#9b9991', marginTop: 2 }}>Prefix: <span style={{ fontFamily: 'monospace' }}>{activeSheet.prefix}</span> · {activeSheet.rows.length} row{activeSheet.rows.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => addFmeaRow(activeSheet.id)}
                style={{ height: 28, padding: '0 12px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                + Add row
              </button>
              <button onClick={() => deleteSheet(activeSheet.id)}
                style={{ height: 28, padding: '0 10px', fontSize: 11, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                Delete sheet
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
              <colgroup>
                {colWidths.map((w, i) => <col key={i} style={{ width: w, minWidth: w }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={9} style={{ padding: '6px 10px', background: '#B8CCE4', fontSize: 11, fontWeight: 600, textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', borderRight: '2px solid rgba(0,0,0,0.1)' }}>
                    Initial Risk Assessment
                  </th>
                  <th colSpan={6} style={{ padding: '6px 10px', background: '#d9d9d9', fontSize: 11, fontWeight: 600, textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)', borderRight: '2px solid rgba(0,0,0,0.1)' }}>
                    Residual Risk
                  </th>
                  <th colSpan={3} style={{ padding: '6px 10px', background: '#EAF3DE', fontSize: 11, fontWeight: 600, textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    Evaluation of Overall Residual Risk Acceptability
                  </th>
                  <th style={{ background: '#f8f7f4', borderBottom: '1px solid rgba(0,0,0,0.1)' }} />
                </tr>
                <tr>
                  {['Hazard No','Hazard','Foreseeable sequence of events (cause)','Hazardous situation','Harm to patient / user','Prob.','Sev.','Risk Est.','Risk Level','Risk Mitigation measure','Res. Prob.','Res. Sev.','Mitig. Risk Est.','Residual Risk Level','Related verification Doc.','Residual Hazard (Yes/No) + Rationale','Benefit / Residual Risk Analysis','New hazards?',''].map((h, i) => rHeaderCell(h, i))}
                </tr>
              </thead>
              <tbody>
                {activeSheet.rows.map((row, i) => {
                  const riskEst = (row.probability && row.severity) ? row.probability * row.severity : null
                  const residualEst = (row.residual_probability && row.residual_severity) ? row.residual_probability * row.residual_severity : null
                  const rl = getRiskLevel(riskEst, criteria)
                  const rrl = getRiskLevel(residualEst, criteria)
                  return (
                    <tr key={row.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <td style={tdStyle(true)}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: '#185FA5' }}>
                          {hazardNo(activeSheet.prefix, i + 1)}
                        </span>
                      </td>
                      <td style={tdStyle()}><Cell value={row.hazard} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'hazard', v)} placeholder="Hazard" /></td>
                      <td style={tdStyle()}><Cell value={row.sequence_of_events} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'sequence_of_events', v)} placeholder="Sequence of events…" /></td>
                      <td style={tdStyle()}><Cell value={row.hazardous_situation} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'hazardous_situation', v)} placeholder="Hazardous situation…" /></td>
                      <td style={tdStyle()}><Cell value={row.harm} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'harm', v)} placeholder="Harm…" /></td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        <Cell value={row.probability ? String(row.probability) : ''} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'probability', v ? parseInt(v) : null)} placeholder="1–5" numeric />
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        <Cell value={row.severity ? String(row.severity) : ''} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'severity', v ? parseInt(v) : null)} placeholder="1–5" numeric />
                      </td>
                      <td style={{ ...tdStyle(true), textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                        {riskEst ?? '—'}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        {riskEst ? (
                          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, background: rl.bg, color: rl.color, border: `0.5px solid ${rl.border}`, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                            {rl.label}
                          </span>
                        ) : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td style={tdStyle()}>
                        <MitigationCell
                          reqIds={row.mitigation_req_ids || []}
                          notes={row.mitigation}
                          reqLists={reqLists}
                          onSaveReqIds={ids => patchFmeaRow(activeSheet.id, row.id, 'mitigation_req_ids', ids)}
                          onSaveNotes={v => patchFmeaRow(activeSheet.id, row.id, 'mitigation', v)}
                        />
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        <Cell value={row.residual_probability ? String(row.residual_probability) : ''} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'residual_probability', v ? parseInt(v) : null)} placeholder="1–5" numeric />
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        <Cell value={row.residual_severity ? String(row.residual_severity) : ''} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'residual_severity', v ? parseInt(v) : null)} placeholder="1–5" numeric />
                      </td>
                      <td style={{ ...tdStyle(true), textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                        {residualEst ?? '—'}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        {residualEst ? (
                          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 4, background: rrl.bg, color: rrl.color, border: `0.5px solid ${rrl.border}`, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                            {rrl.label}
                          </span>
                        ) : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td style={tdStyle()}><Cell value={row.verification_document} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'verification_document', v)} placeholder="Doc reference…" /></td>
                      <td style={tdStyle()}><Cell value={row.residual_hazard} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'residual_hazard', v)} placeholder="Yes/No + rationale…" /></td>
                      <td style={tdStyle()}><Cell value={row.benefit_analysis} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'benefit_analysis', v)} placeholder="N/A" /></td>
                      <td style={tdStyle()}><Cell value={row.new_hazards} onSave={v => patchFmeaRow(activeSheet.id, row.id, 'new_hazards', v)} placeholder="No" /></td>
                      <td style={tdStyle()}>
                        <button onClick={() => deleteFmeaRow(activeSheet.id, row.id)}
                          style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 14 }}>×</button>
                      </td>
                    </tr>
                  )
                })}
                {activeSheet.rows.length === 0 && (
                  <tr><td colSpan={19} style={{ padding: 32, textAlign: 'center', color: '#9b9991', fontSize: 12 }}>
                    No rows yet. Click "+ Add row" to start.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── New sheet modal ── */}
      {showNewSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowNewSheet(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 18 }}>Add FMEA Sheet</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>Sheet name (hazard category)</label>
              <input value={newSheetName} onChange={e => setNewSheetName(e.target.value)}
                placeholder="e.g. Performance, Software, Cybersecurity"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>Hazard ID prefix</label>
              <input value={newSheetPrefix} onChange={e => setNewSheetPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. RP, RS, RC"
                maxLength={6}
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewSheet(false)}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addSheet} disabled={addingSheet || !newSheetName.trim() || !newSheetPrefix.trim()}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: addingSheet ? 0.7 : 1 }}>
                {addingSheet ? 'Creating…' : 'Create sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
