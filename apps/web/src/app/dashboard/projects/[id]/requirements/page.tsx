'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ──
interface Req {
  id: string; group_id: string; list_id: string
  req_id: string; text: string
  parent_req_id: string | null; parent_req_code: string | null
  position: number
}
interface Group { id: string; list_id: string; name: string; prefix: string; position: number; reqs: Req[] }
interface ReqList { id: string; project_id: string; type: 'system' | 'software'; name: string | null; position: number; groups: Group[] }

// ── Group colors ──
const GROUP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Functional':           { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  'Performance':          { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  'Regulatory':           { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  'Usability':            { bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A' },
  'Safety':               { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  'Security':             { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'Security/Cybersecurity':{ bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'Other':                { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' },
}
function groupColor(name: string) {
  return GROUP_COLORS[name] || { bg: '#f8f7f4', color: '#1a1a18', border: '#D3D1C7' }
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
    <input ref={ref} value={val}
      onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      placeholder={placeholder}
      style={{ width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, outline: 'none', fontFamily: mono ? 'monospace' : 'inherit', background: '#fff' }}
    />
  )
  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{ fontSize: 12, color: val ? '#1a1a18' : '#ccc', cursor: 'text', minHeight: 20, padding: '2px 0', fontFamily: mono ? 'monospace' : 'inherit', fontStyle: val ? 'normal' : 'italic' }}>
      {val || placeholder || '—'}
    </div>
  )
}

// ── Parent req picker ──
function ParentPicker({ value, code, systemList, onSave }: {
  value: string | null; code: string | null; systemList: ReqList | null; onSave: (id: string | null, code: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropRef = React.useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, flipUp: false })
  if (!systemList) return <span style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>—</span>
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])
  function handleOpen() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropHeight = 260
      const flipUp = spaceBelow < dropHeight + 10
      setDropPos({
        top: flipUp ? rect.top + window.scrollY - dropHeight - 4 : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        flipUp,
      })
    }
    setOpen(o => !o)
  }
  return (
    <div style={{ position: 'relative' }}>
      <div ref={triggerRef} onClick={handleOpen} title="Click to set parent requirement"
        style={{ fontSize: 11, cursor: 'pointer', color: code ? '#185FA5' : '#ccc', fontFamily: 'monospace', fontStyle: code ? 'normal' : 'italic', userSelect: 'none' as const }}>
        {code || 'None'}
      </div>
      {open && (
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 260, maxHeight: 260, overflowY: 'auto' as const }}>
          <div onClick={() => { onSave(null, null); setOpen(false) }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#9b9991', fontStyle: 'italic', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>None</div>
          {systemList.groups.map(g => (
            <div key={g.id}>
              <div style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, color: '#9b9991', background: '#f8f7f4', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{g.name}</div>
              {g.reqs.map(r => (
                <div key={r.id} onClick={() => { onSave(r.id, r.req_id); setOpen(false) }}
                  style={{ padding: '6px 12px 6px 20px', cursor: 'pointer', fontSize: 12, borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#185FA5', marginRight: 8 }}>{r.req_id}</span>
                  <span style={{ color: '#5F5E5A' }}>{r.text.slice(0, 60)}{r.text.length > 60 ? '…' : ''}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──
export default function RequirementsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [lists, setLists] = useState<ReqList[]>([])
  const [loading, setLoading] = useState(true)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [sessionRole, setSessionRole] = useState('')

  // New list modal
  const [showNewList, setShowNewList] = useState(false)
  const [newListType, setNewListType] = useState<'system' | 'software'>('software')
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)

  // New group modal
  const [showNewGroup, setShowNewGroup] = useState<string | null>(null) // listId
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupPrefix, setNewGroupPrefix] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/requirements`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setLists(data.lists || [])
    if (data.lists?.length > 0 && !activeListId) setActiveListId(data.lists[0].id)
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
  }, [projectId])

  const canEdit = ['admin', 'consultant'].includes(sessionRole)
  const activeList = lists.find(l => l.id === activeListId) || null
  const systemList = lists.find(l => l.type === 'system') || null
  const hasSystem = !!systemList
  const [structuredTemplates, setStructuredTemplates] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/structured-templates').then(r => r.ok ? r.json() : []).then(setStructuredTemplates)
  }, [])

  // ── List actions ──
  async function addList() {
    if (newListType === 'software' && !newListName.trim()) return
    setAddingList(true)
    const res = await fetch(`/api/projects/${projectId}/requirements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newListType, name: newListName.trim() || null }),
    })
    if (res.ok) {
      const list = await res.json()
      setLists(prev => [...prev, list])
      setActiveListId(list.id)
      setShowNewList(false); setNewListName('')
    }
    setAddingList(false)
  }

  async function deleteList(listId: string) {
    if (!confirm('Delete this requirements list and all its requirements?')) return
    await fetch(`/api/projects/${projectId}/requirements/${listId}`, { method: 'DELETE' })
    const remaining = lists.filter(l => l.id !== listId)
    setLists(remaining)
    setActiveListId(remaining.length > 0 ? remaining[0].id : null)
  }

  // ── Group actions ──
  async function addGroup(listId: string) {
    if (!newGroupName.trim()) return
    setAddingGroup(true)
    const res = await fetch(`/api/projects/${projectId}/requirements/${listId}/groups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim(), prefix: newGroupPrefix.trim() }),
    })
    if (res.ok) {
      const group = await res.json()
      setLists(prev => prev.map(l => l.id === listId ? { ...l, groups: [...l.groups, group] } : l))
      setShowNewGroup(null); setNewGroupName(''); setNewGroupPrefix('')
    }
    setAddingGroup(false)
  }

  async function patchGroup(listId: string, groupId: string, field: string, value: string) {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, groups: l.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
    } : l))
    await fetch(`/api/projects/${projectId}/requirements/${listId}/groups`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, [field]: value }),
    })
  }

  async function deleteGroup(listId: string, groupId: string) {
    if (!confirm('Delete this group and all its requirements?')) return
    setLists(prev => prev.map(l => l.id === listId ? { ...l, groups: l.groups.filter(g => g.id !== groupId) } : l))
    await fetch(`/api/projects/${projectId}/requirements/${listId}/groups?groupId=${groupId}`, { method: 'DELETE' })
  }

  // ── Req actions ──
  async function addReq(listId: string, groupId: string) {
    const res = await fetch(`/api/projects/${projectId}/requirements/${listId}/reqs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId }),
    })
    if (res.ok) {
      const req = await res.json()
      setLists(prev => prev.map(l => l.id === listId ? {
        ...l, groups: l.groups.map(g => g.id === groupId ? { ...g, reqs: [...g.reqs, req] } : g)
      } : l))
    }
  }

  async function patchReq(listId: string, groupId: string, reqId: string, field: string, value: any) {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, groups: l.groups.map(g => g.id === groupId ? {
        ...g, reqs: g.reqs.map(r => r.id === reqId ? { ...r, [field]: value } : r)
      } : g)
    } : l))
    await fetch(`/api/projects/${projectId}/requirements/${listId}/reqs`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reqId, field, value }),
    })
  }

  async function deleteReq(listId: string, groupId: string, reqId: string) {
    if (!confirm('Delete this requirement?')) return
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l, groups: l.groups.map(g => g.id === groupId ? { ...g, reqs: g.reqs.filter(r => r.id !== reqId) } : g)
    } : l))
    await fetch(`/api/projects/${projectId}/requirements/${listId}/reqs?reqId=${reqId}`, { method: 'DELETE' })
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>

  const totalReqs = lists.reduce((sum, l) => sum + l.groups.reduce((s, g) => s + g.reqs.length, 0), 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>Project</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>Requirements</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Requirements</div>
          <div style={{ fontSize: 12, color: '#9b9991', marginTop: 2 }}>{totalReqs} requirement{totalReqs !== 1 ? 's' : ''} across {lists.length} list{lists.length !== 1 ? 's' : ''}</div>
        </div>
        {canEdit && (
          <button onClick={() => setShowNewList(true)}
            style={{ height: 32, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
            + Add list
          </button>
        )}
      </div>

      {lists.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>No requirements lists yet</div>
          <div style={{ fontSize: 13, color: '#6b6a64', marginBottom: 20 }}>Create a system or software requirements list to get started.</div>
          {canEdit && (
            <button onClick={() => setShowNewList(true)}
              style={{ height: 34, padding: '0 18px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
              + Add list
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, borderBottom: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' as const }}>
            {lists.map(list => (
              <button key={list.id} onClick={() => setActiveListId(list.id)}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: activeListId === list.id ? 500 : 400,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: activeListId === list.id ? '2px solid #185FA5' : '2px solid transparent',
                  color: activeListId === list.id ? '#185FA5' : '#6b6a64',
                  whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: list.type === 'system' ? '#EEEDFE' : '#E6F1FB', color: list.type === 'system' ? '#3C3489' : '#0C447C' }}>
                  {list.type === 'system' ? 'SYS' : 'SW'}
                </span>
                {list.type === 'system' ? 'System Requirements' : (list.name || 'Software Requirements')}
              </button>
            ))}
          </div>

          {/* Active list */}
          {activeList && (
            <div>
              {/* List header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: activeList.type === 'system' ? '#EEEDFE' : '#E6F1FB', color: activeList.type === 'system' ? '#3C3489' : '#0C447C', border: activeList.type === 'system' ? '0.5px solid #AFA9EC' : '0.5px solid #85B7EB', fontWeight: 500 }}>
                    {activeList.type === 'system' ? 'System' : 'Software'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {activeList.type === 'system' ? 'System Requirements List' : activeList.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(() => {
                      const matchingTemplate = structuredTemplates.find(t => t.req_type === activeList.type && t.status === 'active')
                      if (matchingTemplate) return (
                        <a href={`/dashboard/projects/${projectId}/requirements/document/${activeList.type}`}
                          style={{ height: 28, padding: '0 12px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                          📄 Generate Document
                        </a>
                      )
                      return null
                    })()}
                    {canEdit && <>
                    <button onClick={() => { setShowNewGroup(activeList.id); setNewGroupName(''); setNewGroupPrefix('') }}
                      style={{ height: 28, padding: '0 12px', fontSize: 11, background: 'rgba(78,140,140,0.1)', border: '0.5px solid rgba(78,140,140,0.35)', borderRadius: 6, color: '#2e5f5f', cursor: 'pointer' }}>
                      + Add group
                    </button>
                    <button onClick={() => deleteList(activeList.id)}
                      style={{ height: 28, padding: '0 10px', fontSize: 11, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                      Delete list
                    </button>
                    </>}
                  </div>
              </div>

              {/* Groups */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {activeList.groups.map(group => {
                  const gc = groupColor(group.name)
                  const isSW = activeList.type === 'software'
                  return (
                    <div key={group.id} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                      {/* Group header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: gc.bg, borderBottom: `0.5px solid ${gc.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: gc.color }}>{group.name}</span>
                          <span style={{ fontSize: 10, color: gc.color, opacity: 0.7 }}>{group.reqs.length} req{group.reqs.length !== 1 ? 's' : ''}</span>
                          {canEdit && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                              <span style={{ fontSize: 10, color: gc.color, opacity: 0.6 }}>Prefix:</span>
                              <Cell value={group.prefix || ''} placeholder="e.g. SYS-FUNC"
                                onSave={v => patchGroup(activeList.id, group.id, 'prefix', v)} mono />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => addReq(activeList.id, group.id)}
                            style={{ height: 24, padding: '0 10px', fontSize: 11, background: 'rgba(255,255,255,0.7)', border: `0.5px solid ${gc.border}`, borderRadius: 5, color: gc.color, cursor: 'pointer' }}>
                            + Add req
                          </button>
                          {canEdit && (
                            <button onClick={() => deleteGroup(activeList.id, group.id)}
                              style={{ height: 24, padding: '0 8px', fontSize: 11, background: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, color: '#9b9991', cursor: 'pointer' }}>
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f7f4' }}>
                            <th style={{ width: 130, padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6b6a64', borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>REQ ID</th>
                            <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6b6a64', borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderRight: isSW && hasSystem ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>Requirement text</th>
                            {isSW && hasSystem && (
                              <th style={{ width: 160, padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6b6a64', borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>Parent (SYS)</th>
                            )}
                            {canEdit && <th style={{ width: 36, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }} />}
                          </tr>
                        </thead>
                        <tbody>
                          {group.reqs.length === 0 ? (
                            <tr>
                              <td colSpan={isSW && hasSystem ? (canEdit ? 4 : 3) : (canEdit ? 3 : 2)}
                                style={{ padding: '16px 12px', textAlign: 'center', color: '#ccc', fontSize: 12, fontStyle: 'italic' }}>
                                No requirements yet. Click "+ Add req" to start.
                              </td>
                            </tr>
                          ) : group.reqs.map((r, i) => (
                            <tr key={r.id} style={{ borderBottom: i < group.reqs.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                              <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderRight: '0.5px solid rgba(0,0,0,0.05)' }}>
                                <Cell value={r.req_id} placeholder={group.prefix ? `${group.prefix}-01` : 'REQ-01'} mono
                                  onSave={v => patchReq(activeList.id, group.id, r.id, 'req_id', v)} />
                              </td>
                              <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderRight: isSW && hasSystem ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                                <Cell value={r.text} placeholder="Enter requirement text…"
                                  onSave={v => patchReq(activeList.id, group.id, r.id, 'text', v)} />
                              </td>
                              {isSW && hasSystem && (
                                <td style={{ padding: '8px 12px', verticalAlign: 'middle', borderRight: '0.5px solid rgba(0,0,0,0.05)' }}>
                                  <ParentPicker
                                    value={r.parent_req_id} code={r.parent_req_code}
                                    systemList={systemList}
                                    onSave={(id, code) => {
                                      patchReq(activeList.id, group.id, r.id, 'parent_req_id', id)
                                      setLists(prev => prev.map(l => l.id === activeList.id ? {
                                        ...l, groups: l.groups.map(g => g.id === group.id ? {
                                          ...g, reqs: g.reqs.map(rr => rr.id === r.id ? { ...rr, parent_req_id: id, parent_req_code: code } : rr)
                                        } : g)
                                      } : l))
                                    }}
                                  />
                                </td>
                              )}
                              {canEdit && (
                                <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                                  <button onClick={() => deleteReq(activeList.id, group.id, r.id)}
                                    style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New list modal ── */}
      {showNewList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowNewList(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 18 }}>Add Requirements List</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 6 }}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['system', 'software'] as const).map(t => (
                  <button key={t} onClick={() => setNewListType(t)}
                    style={{ flex: 1, height: 34, fontSize: 12, borderRadius: 8, cursor: 'pointer', border: newListType === t ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.2)', background: newListType === t ? '#E6F1FB' : '#fff', color: newListType === t ? '#185FA5' : '#1a1a18', fontWeight: newListType === t ? 500 : 400 }}>
                    {t === 'system' ? 'System' : 'Software'}
                  </button>
                ))}
              </div>
              {newListType === 'system' && hasSystem && (
                <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 8 }}>A system requirements list already exists for this project.</div>
              )}
            </div>
            {newListType === 'software' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>Component name *</label>
                <input value={newListName} onChange={e => setNewListName(e.target.value)}
                  placeholder="e.g. Mobile App, Backend, Embedded"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowNewList(false)}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addList} disabled={addingList || (newListType === 'system' && hasSystem) || (newListType === 'software' && !newListName.trim())}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: addingList ? 0.7 : 1 }}>
                {addingList ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New group modal ── */}
      {showNewGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowNewGroup(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 360, border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 18 }}>Add Group</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>Group name *</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g. Functional, Safety…"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>Prefix</label>
              <input value={newGroupPrefix} onChange={e => setNewGroupPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. SYS-FUNC, SW-SAFE"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewGroup(null)}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => addGroup(showNewGroup)} disabled={addingGroup || !newGroupName.trim()}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {addingGroup ? 'Adding…' : 'Add group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
