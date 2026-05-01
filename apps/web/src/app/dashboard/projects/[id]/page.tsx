'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import FilePanel from '@/components/FilePanel'

const ANNEXES = ['Annex I','Annex II','Annex III','Annex IV','Annex V',
                 'Annex VI','Annex VII','Annex VIII','Annex IX','Annex X']

const DOC_STATUS: Record<string, {bg:string;color:string;border:string;label:string}> = {
  superseded: { bg: 'rgba(90,100,114,0.08)', color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
  draft:      {bg:'#F1EFE8',color:'#5F5E5A',border:'#D3D1C7',label:'Draft'},
  inprogress: {bg:'#FAEEDA',color:'#633806',border:'#FAC775',label:'In progress'},
  review:     {bg:'#E6F1FB',color:'#0C447C',border:'#85B7EB',label:'In review'},
  approved:   {bg:'#EAF3DE',color:'#27500A',border:'#97C459',label:'Approved'},
}

const PROJ_STATUS: Record<string, {bg:string;color:string;border:string;label:string}> = {
  draft:    {bg:'#F1EFE8',color:'#5F5E5A',border:'#D3D1C7',label:'Draft'},
  active:   {bg:'#E6F1FB',color:'#0C447C',border:'#85B7EB',label:'Active'},
  review:   {bg:'#FAEEDA',color:'#633806',border:'#FAC775',label:'Under review'},
  approved: {bg:'#EAF3DE',color:'#27500A',border:'#97C459',label:'Approved'},
  archived: {bg:'#F1EFE8',color:'#888780',border:'#D3D1C7',label:'Archived'},
}

const ROLE_STYLES: Record<string, {bg:string;color:string;border:string}> = {
  admin:      {bg:'#EEEDFE',color:'#3C3489',border:'#AFA9EC'},
  consultant: {bg:'#E6F1FB',color:'#0C447C',border:'#85B7EB'},
  client:     {bg:'#EAF3DE',color:'#27500A',border:'#97C459'},
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
interface User { id: string; name: string; email: string; role: string }
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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [trackerDocs, setTrackerDocs] = useState<TrackerDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAnnex, setActiveAnnex] = useState('Annex I')
  const [editMode, setEditMode] = useState(false)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocCode, setNewDocCode] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)
  const [trackerOpen, setTrackerOpen] = useState(false)
  const [projectFiles, setProjectFiles] = useState<Record<string, string[]>>({})
  const [allProjectFiles, setAllProjectFiles] = useState<any[]>([])
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [sessionRole, setSessionRole] = useState<string>('')

  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')

  const [showAddMember, setShowAddMember] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [addingMember, setAddingMember] = useState(false)

  async function load() {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { router.push('/dashboard/projects'); return }
    const data = await res.json()
    setProject(data.project)
    setDocs(data.docs)
    setTrackerDocs(data.docs.map((d: any) => ({
      id: d.id, annex: d.annex, name: d.name, code: d.code, status: d.status,
      revision: d.revision || null, color_flag: d.color_flag || null,
      tracker_comment: d.tracker_comment || null,
      assigned_to: d.assigned_to || null, assigned_name: d.assigned_name || null,
    })))
    setLoading(false)
  }

  async function loadMembers() {
    const res = await fetch(`/api/projects/${id}/members`)
    if (res.ok) setMembers(await res.json())
  }

  async function loadFiles() {
    const res = await fetch(`/api/projects/${id}/files`)
    if (res.ok) {
      const data = await res.json()
      setAllProjectFiles(data.files || [])
      const byAnnex: Record<string, string[]> = {}
      for (const f of (data.files || [])) {
        if (!byAnnex[f.annex]) byAnnex[f.annex] = []
        byAnnex[f.annex].push(f.original_name)
      }
      setProjectFiles(byAnnex)
    }
  }

  async function loadTemplates() {
    setLoadingTemplates(true)
    const res = await fetch('/api/templates')
    if (res.ok) setTemplates(await res.json())
    setLoadingTemplates(false)
  }

  async function addFromTemplate(template: any) {
    setAddingTemplate(true)
    const res = await fetch(`/api/projects/${id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annex: activeAnnex, name: template.name, code: template.tag_code, template_id: template.id }),
    })
    if (res.ok) { setShowTemplatePicker(false); setTemplateSearch(''); load() }
    setAddingTemplate(false)
  }

  useEffect(() => {
    load()
    loadMembers()
    loadFiles()
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
  }, [id])

  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUsers(true)
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(userSearch)}`)
        if (res.ok) {
          const all = await res.json()
          const memberIds = new Set(members.map(m => m.user_id))
          setUserResults(all.filter((u: User) => !memberIds.has(u.id)))
        }
      } finally { setSearchingUsers(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, members])

  async function addMember(user: User) {
    setAddingMember(true)
    await fetch(`/api/projects/${id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, role: 'editor' }),
    })
    setUserSearch(''); setUserResults([]); setShowAddMember(false); setAddingMember(false)
    loadMembers()
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the project?')) return
    await fetch(`/api/projects/${id}/members?user_id=${userId}`, { method: 'DELETE' })
    loadMembers()
  }

  async function updateDocStatus(docId: string, status: string) {
    await fetch(`/api/projects/${id}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deleteDoc(docId: string, docName: string) {
    if (!confirm(`Permanently delete "${docName}" from this project?\n\nThis cannot be undone.`)) return
    await fetch(`/api/projects/${id}/documents/${docId}`, { method: 'DELETE' })
    load()
  }

  async function addDoc() {
    if (!newDocName.trim() || !newDocCode.trim()) return
    setAddingDoc(true)
    await fetch(`/api/projects/${id}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annex: activeAnnex, name: newDocName, code: newDocCode }),
    })
    setNewDocName(''); setNewDocCode(''); setShowAddDoc(false); setAddingDoc(false)
    load()
  }

  async function updateProjectStatus(status: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function patchDoc(docId: string, fields: Record<string, any>) {
    setSaving(s => ({ ...s, [docId]: true }))
    await fetch(`/api/projects/${id}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(s => ({ ...s, [docId]: false }))
    setTrackerDocs(prev => prev.map(d => d.id === docId ? { ...d, ...fields } : d))
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#9b9991',fontSize:13}}>Loading...</div>
  if (!project) return null

  const isClient = sessionRole === 'client'
  const annexDocs = docs.filter((d: any) => d.annex === activeAnnex)
  const annexCounts = ANNEXES.reduce((acc, a) => ({ ...acc, [a]: docs.filter((d:any) => d.annex === a).length }), {} as Record<string,number>)
  const total = docs.length
  const approved = docs.filter((d:any) => d.status === 'approved').length
  const inprog = docs.filter((d:any) => d.status === 'inprogress' || d.status === 'review').length
  const draft = docs.filter((d:any) => d.status === 'draft').length
  const pct = total > 0 ? Math.round((approved/total)*100) : 0
  const ps = PROJ_STATUS[project.status] || PROJ_STATUS.draft
  const trackerByAnnex = ANNEXES.map(a => ({ annex: a, docs: trackerDocs.filter(d => d.annex === a) })).filter(g => g.docs.length > 0)
  const filteredTemplates = templates.filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.tag_code.toLowerCase().includes(templateSearch.toLowerCase()))

  return (
    <div>
      <div style={{fontSize:12,color:'#9b9991',marginBottom:18,display:'flex',alignItems:'center',gap:5}}>
        <Link href="/dashboard/projects" style={{color:'#9b9991',textDecoration:'none'}}>Projects</Link>
        <span>›</span>
        <span style={{color:'#1a1a18'}}>{project.name}</span>
      </div>

      {/* Top buttons */}
      <div style={{marginBottom:10,display:'flex',justifyContent:'flex-end',gap:8}}>
        <a href={`/dashboard/projects/${id}/fmea`}
          style={{display:'inline-flex',alignItems:'center',gap:6,height:32,padding:'0 14px',fontSize:12,background:'rgba(165,40,40,0.07)',border:'0.5px solid rgba(165,40,40,0.25)',borderRadius:8,color:'#8B1A1A',textDecoration:'none',fontWeight:500}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Risk Analysis
        </a>
        <a href={`/dashboard/projects/${id}/variables`}
          style={{display:'inline-flex',alignItems:'center',gap:6,height:32,padding:'0 14px',fontSize:12,background:'rgba(78,140,140,0.08)',border:'0.5px solid rgba(78,140,140,0.3)',borderRadius:8,color:'#2e5f5f',textDecoration:'none',fontWeight:500}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          Project data
        </a>
      </div>

      {/* Project header */}
      <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,padding:'16px 20px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:12}}>
          <div>
            <div style={{fontSize:17,fontWeight:500,marginBottom:2}}>{project.name}</div>
            <div style={{fontSize:13,color:'#6b6a64'}}>{project.device_name}</div>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap' as const,marginTop:8}}>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'#E6F1FB',color:'#0C447C',border:'0.5px solid #85B7EB'}}>{project.list_name}</span>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:ps.bg,color:ps.color,border:`0.5px solid ${ps.border}`}}>{ps.label}</span>
              <span style={{fontSize:11,color:'#9b9991'}}>{project.manufacturer_name}{project.manufacturer_country?` · ${project.manufacturer_country}`:''}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {!isClient && (
              <button onClick={() => setEditMode(!editMode)} style={{height:30,padding:'0 12px',fontSize:12,background:editMode?'#185FA5':'transparent',border:editMode?'0.5px solid #185FA5':'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,color:editMode?'#fff':'#1a1a18',cursor:'pointer'}}>
                {editMode ? 'Done editing' : 'Edit project'}
              </button>
            )}
            {!isClient && (
              <select value={project.status} onChange={e => updateProjectStatus(e.target.value)}
                style={{height:30,padding:'0 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,background:'#fff',cursor:'pointer'}}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="review">Under review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            )}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,paddingTop:12,borderTop:'0.5px solid rgba(0,0,0,0.08)'}}>
          <div>
            <div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>Progress</div>
            <div style={{fontSize:16,fontWeight:500}}>{approved} / {total}</div>
            <div style={{height:4,background:'#f1efe8',borderRadius:2,overflow:'hidden',marginTop:4}}>
              <div style={{width:`${pct}%`,height:'100%',background:pct===100?'#3B6D11':'#185FA5',borderRadius:2}}/>
            </div>
          </div>
          <div><div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>Approved</div><div style={{fontSize:16,fontWeight:500,color:'#3B6D11'}}>{approved}</div></div>
          <div><div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>In progress</div><div style={{fontSize:16,fontWeight:500,color:'#BA7517'}}>{inprog}</div></div>
          <div><div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>Draft</div><div style={{fontSize:16,fontWeight:500}}>{draft}</div></div>
        </div>
      </div>

      {/* Members */}
      <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,padding:'14px 20px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500}}>Members</div>
          {!isClient && <button onClick={() => setShowAddMember(v => !v)} style={{height:26,padding:'0 10px',fontSize:11,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}>+ Add member</button>}
        </div>
        {showAddMember && (
          <div style={{marginBottom:12,position:'relative'}}>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…" autoFocus
              style={{width:'100%',height:32,padding:'0 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,outline:'none',boxSizing:'border-box' as const}} />
            {searchingUsers && <div style={{fontSize:11,color:'#9b9991',padding:'6px 0'}}>Searching…</div>}
            {userResults.length > 0 && (
              <div style={{position:'absolute',top:36,left:0,right:0,zIndex:20,background:'#fff',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',overflow:'hidden'}}>
                {userResults.map(u => {
                  const rs = ROLE_STYLES[u.role] || ROLE_STYLES.client
                  return (
                    <div key={u.id} onClick={() => !addingMember && addMember(u)}
                      style={{padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,borderBottom:'0.5px solid rgba(0,0,0,0.06)',background:'#fff'}}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500}}>{u.name}</div>
                        <div style={{fontSize:11,color:'#9b9991'}}>{u.email}</div>
                      </div>
                      <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:rs.bg,color:rs.color,border:`0.5px solid ${rs.border}`}}>{u.role}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {userSearch && !searchingUsers && userResults.length === 0 && <div style={{fontSize:11,color:'#9b9991',padding:'6px 0'}}>No users found.</div>}
          </div>
        )}
        {members.length === 0 ? (
          <div style={{fontSize:12,color:'#9b9991'}}>No members yet.</div>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap' as const,gap:8}}>
            {members.map(m => {
              const rs = ROLE_STYLES[m.user_role] || ROLE_STYLES.client
              return (
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 10px',borderRadius:20,background:'#f8f7f4',border:'0.5px solid rgba(0,0,0,0.1)'}}>
                  <div style={{width:22,height:22,borderRadius:'50%',flexShrink:0,background:rs.bg,color:rs.color,border:`0.5px solid ${rs.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600}}>
                    {m.name.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:500}}>{m.name}</div>
                    <div style={{fontSize:10,color:'#9b9991'}}>{m.user_role}</div>
                  </div>
                  {!isClient && <button onClick={() => removeMember(m.user_id)} style={{background:'none',border:'none',color:'#9b9991',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px',marginLeft:2}} title="Remove member">×</button>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Annex + docs grid */}
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:14,marginBottom:14}}>
        <div style={{border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,overflow:'hidden'}}>
          {ANNEXES.map(a => (
            <div key={a} onClick={() => {setActiveAnnex(a);setShowAddDoc(false)}} style={{
              padding:'9px 12px',cursor:'pointer',fontSize:13,
              borderBottom:'0.5px solid rgba(0,0,0,0.06)',
              background:a===activeAnnex?'#E6F1FB':'#fff',
              color:a===activeAnnex?'#0C447C':'#1a1a18',
              fontWeight:a===activeAnnex?500:400,
              display:'flex',alignItems:'center',justifyContent:'space-between',
            }}>
              <span>{a}</span>
              <span style={{fontSize:11,borderRadius:20,padding:'1px 6px',background:a===activeAnnex?'#B5D4F4':'#f1efe8',color:a===activeAnnex?'#0C447C':'#9b9991'}}>{annexCounts[a]||0}</span>
            </div>
          ))}
        </div>

        <div style={{border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.08)',background:'#f8f7f4',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>{activeAnnex}</div>
              <div style={{fontSize:12,color:'#6b6a64',marginTop:1}}>{annexDocs.length} document{annexDocs.length!==1?'s':''}</div>
            </div>
            {editMode && (
              <div style={{display:'flex',gap:6}}>
                <button onClick={() => { setShowTemplatePicker(true); loadTemplates() }}
                  style={{height:28,padding:'0 10px',fontSize:12,background:'rgba(78,140,140,0.1)',border:'0.5px solid rgba(78,140,140,0.35)',borderRadius:6,color:'#2e5f5f',cursor:'pointer'}}>
                  + From template
                </button>
                <button onClick={() => setShowAddDoc(true)} style={{height:28,padding:'0 10px',fontSize:12,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}>
                  + Add document
                </button>
              </div>
            )}
          </div>

          {annexDocs.length === 0 && !showAddDoc ? (
            <div style={{padding:36,textAlign:'center',color:'#9b9991',fontSize:13}}>
              No documents in {activeAnnex}.{editMode?' Click "Add document" to add one.':''}
            </div>
          ) : annexDocs.map((d:any) => {
            const s = DOC_STATUS[d.status] || DOC_STATUS.draft
            const isReview = d.status === 'review'
            return (
              <div key={d.id} style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:isReview?'#FFFBF5':'#fff'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{d.name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                    <span style={{fontSize:11,color:'#9b9991',fontFamily:'monospace'}}>{d.code}</span>
                    {!editMode && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`,fontWeight:500}}>{isReview ? '⏳ ' : ''}{s.label}</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  {editMode ? (
                    <select value={d.status} onChange={e => updateDocStatus(d.id, e.target.value)}
                      style={{height:26,padding:'0 6px',fontSize:11,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,background:'#fff'}}>
                      <option value="draft">Draft</option>
                      <option value="inprogress">In progress</option>
                      <option value="review">In review</option>
                      <option value="approved">Approved</option>
                    </select>
                  ) : null}

                  <Link href={`/dashboard/projects/${id}/documents/${d.id}`} style={{height:26,padding:'0 10px',fontSize:11,background:'#E6F1FB',border:'0.5px solid #85B7EB',borderRadius:6,color:'#185FA5',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                    Open
                  </Link>
                  {sessionRole === 'admin' && (
                    <button onClick={() => deleteDoc(d.id, d.name)} style={{height:26,padding:'0 8px',fontSize:11,background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:6,color:'#A32D2D',cursor:'pointer'}}>Delete</button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Uploaded files for active annex */}
          {(allProjectFiles.filter((f: any) => f.annex === activeAnnex)).map((f: any) => (
            <div key={f.id} style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:'#fff'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>
                  <span>📎</span>{f.original_name}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                  <span style={{fontSize:11,color:'#9b9991'}}>{(f.file_size/1024/1024).toFixed(1)}MB</span>
                  <span style={{fontSize:11,color:'#9b9991'}}>· {f.uploaded_by_name}</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <a href={`/api/projects/${id}/files/${f.id}`} download={f.original_name}
                  style={{height:26,padding:'0 10px',fontSize:11,background:'#E6F1FB',border:'0.5px solid #85B7EB',borderRadius:6,color:'#185FA5',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                  Download
                </a>
                {sessionRole === 'admin' && (
                  <button onClick={async () => { if (!confirm(`Delete "${f.original_name}"?`)) return; await fetch(`/api/projects/${id}/files/${f.id}`,{method:'DELETE'}); loadFiles() }}
                    style={{height:26,padding:'0 8px',fontSize:11,background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:6,color:'#A32D2D',cursor:'pointer'}}>Delete</button>
                )}
              </div>
            </div>
          ))}

          {activeAnnex === 'Annex III' && (
            <div style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:'rgba(24,95,165,0.03)'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#185FA5'}}>Requirements</div>
                <div style={{fontSize:11,color:'#9b9991',fontFamily:'monospace',marginTop:1}}>REQUIREMENTS</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <Link href={`/dashboard/projects/${id}/requirements`}
                  style={{height:26,padding:'0 14px',fontSize:11,background:'#E6F1FB',border:'0.5px solid #85B7EB',borderRadius:6,color:'#185FA5',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,fontWeight:500}}>
                  Open Requirements
                </Link>
              </div>
            </div>
          )}
          {activeAnnex === 'Annex VI' && (
            <div style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:'rgba(60,52,137,0.03)'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#3C3489'}}>Traceability Matrix</div>
                <div style={{fontSize:11,color:'#9b9991',fontFamily:'monospace',marginTop:1}}>TRACEABILITY</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <Link href={`/dashboard/projects/${id}/traceability`}
                  style={{height:26,padding:'0 14px',fontSize:11,background:'#EEEDFE',border:'0.5px solid #AFA9EC',borderRadius:6,color:'#3C3489',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,fontWeight:500}}>
                  Open Traceability
                </Link>
              </div>
            </div>
          )}
          {activeAnnex === 'Annex V' && (
            <div style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:'rgba(165,40,40,0.03)'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#8B1A1A'}}>Risk Analysis (FMEA)</div>
                <div style={{fontSize:11,color:'#9b9991',fontFamily:'monospace',marginTop:1}}>FMEA</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <Link href={`/dashboard/projects/${id}/fmea`}
                  style={{height:26,padding:'0 14px',fontSize:11,background:'rgba(165,40,40,0.07)',border:'0.5px solid rgba(165,40,40,0.25)',borderRadius:6,color:'#8B1A1A',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,fontWeight:500}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  Open FMEA
                </Link>
              </div>
            </div>
          )}
          <FilePanel projectId={id} annex={activeAnnex} sessionRole={sessionRole} />

          {showAddDoc && (
            <div style={{padding:'10px 14px',borderTop:'0.5px solid rgba(0,0,0,0.08)',background:'#f8f7f4',display:'flex',gap:8,alignItems:'center'}}>
              <input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Document name"
                style={{flex:2,padding:'6px 9px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,outline:'none'}}/>
              <input value={newDocCode} onChange={e => setNewDocCode(e.target.value)} placeholder="Code"
                style={{flex:1,padding:'6px 9px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,outline:'none',fontFamily:'monospace'}}/>
              <button onClick={addDoc} disabled={addingDoc} style={{height:28,padding:'0 10px',fontSize:12,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}>
                {addingDoc?'Adding...':'Add'}
              </button>
              <button onClick={() => setShowAddDoc(false)} style={{height:28,padding:'0 8px',fontSize:12,background:'none',border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,cursor:'pointer'}}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Status Tracker */}
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
                    const cf = COLOR_FLAGS[d.color_flag || 'none']
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
                          {isClient
                            ? <span style={{ fontSize: 12, color: d.revision ? '#1a1a18' : '#ccc', fontFamily: 'monospace' }}>{d.revision || '—'}</span>
                            : <EditableCell value={d.revision || ''} placeholder="1.0" mono onSave={v => patchDoc(d.id, { revision: v })} />}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                          {isClient
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 12, background: cf.bg, border: `0.5px solid ${cf.border}`, fontSize: 11, color: cf.color }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: cf.dot }} />{cf.label}</span>
                            : <ColorPicker value={d.color_flag} onSave={v => patchDoc(d.id, { color_flag: v || null })} />}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 160 }}>
                          {isClient
                            ? <span style={{ fontSize: 12, color: d.tracker_comment ? '#1a1a18' : '#ccc' }}>{d.tracker_comment || '—'}</span>
                            : <EditableCell value={d.tracker_comment || ''} placeholder="Add comment…" onSave={v => patchDoc(d.id, { tracker_comment: v })} />}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 130 }}>
                          {isClient
                            ? <span style={{ fontSize: 12, color: d.assigned_name ? '#1a1a18' : '#ccc' }}>{d.assigned_name || 'Unassigned'}</span>
                            : <AssignedPicker value={d.assigned_to} name={d.assigned_name} members={members} onSave={(uid, name) => { patchDoc(d.id, { assigned_to: uid || null }); setTrackerDocs(prev => prev.map(td => td.id === d.id ? { ...td, assigned_to: uid || null, assigned_name: name || null } : td)) }} />}
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

      {/* Template picker modal */}
      {showTemplatePicker && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}
          onClick={() => !addingTemplate && setShowTemplatePicker(false)}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:520,border:'0.5px solid rgba(0,0,0,0.12)',boxShadow:'0 8px 32px rgba(0,0,0,0.14)',overflow:'hidden',maxHeight:'80vh',display:'flex',flexDirection:'column' as const}}
            onClick={e => e.stopPropagation()}>
            <div style={{padding:'14px 20px',borderBottom:'0.5px solid rgba(0,0,0,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <div style={{fontSize:14,fontWeight:500}}>Add from template</div>
                <div style={{fontSize:11,color:'#9b9991',marginTop:2}}>Adding to {activeAnnex}</div>
              </div>
              <button onClick={() => setShowTemplatePicker(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#6b6a64'}}>×</button>
            </div>
            <div style={{padding:'10px 16px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',flexShrink:0}}>
              <input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                placeholder="Search templates…"
                style={{width:'100%',padding:'7px 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,outline:'none',boxSizing:'border-box' as const}} />
            </div>
            <div style={{overflowY:'auto' as const,flex:1}}>
              {loadingTemplates ? (
                <div style={{padding:24,textAlign:'center',color:'#9b9991',fontSize:12}}>Loading templates…</div>
              ) : filteredTemplates.length === 0 ? (
                <div style={{padding:24,textAlign:'center',color:'#9b9991',fontSize:12}}>No templates found.</div>
              ) : filteredTemplates.map((t: any) => (
                <div key={t.id}
                  onClick={() => !addingTemplate && addFromTemplate(t)}
                  style={{padding:'10px 16px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500}}>{t.name}</div>
                    <div style={{fontSize:10,color:'#9b9991',fontFamily:'monospace',marginTop:1}}>{t.tag_code}{t.annex ? ` · ${t.annex}` : ''}</div>
                  </div>
                  <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'#E6F1FB',color:'#0C447C',border:'0.5px solid #85B7EB',flexShrink:0}}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
