'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const ANNEXES = ['Annex I','Annex II','Annex III','Annex IV','Annex V',
                 'Annex VI','Annex VII','Annex VIII','Annex IX','Annex X']

const DOC_STATUS: Record<string, {bg:string;color:string;border:string;label:string}> = {
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

interface Member {
  id: string
  user_id: string
  name: string
  email: string
  user_role: string
  role: string
  joined_at: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAnnex, setActiveAnnex] = useState('Annex I')
  const [editMode, setEditMode] = useState(false)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocCode, setNewDocCode] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)
  const [showDocSettings, setShowDocSettings] = useState(false)
  const [docSettings, setDocSettings] = useState({
    footer_confidentiality: 'Confidential',
    footer_show_version: true,
    footer_show_date: true,
    footer_show_page_numbers: true,
  })

  // Members
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
    setDocSettings({
      footer_confidentiality: data.project.footer_confidentiality || 'Confidential',
      footer_show_version: data.project.footer_show_version ?? true,
      footer_show_date: data.project.footer_show_date ?? true,
      footer_show_page_numbers: data.project.footer_show_page_numbers ?? true,
    })
    setLoading(false)
  }

  async function loadMembers() {
    const res = await fetch(`/api/projects/${id}/members`)
    if (res.ok) setMembers(await res.json())
  }

  useEffect(() => { load(); loadMembers() }, [id])

  // Search users
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUsers(true)
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(userSearch)}`)
        if (res.ok) {
          const all = await res.json()
          // Filter out already members
          const memberIds = new Set(members.map(m => m.user_id))
          setUserResults(all.filter((u: User) => !memberIds.has(u.id)))
        }
      } finally {
        setSearchingUsers(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, members])

  async function addMember(user: User) {
    setAddingMember(true)
    await fetch(`/api/projects/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, role: 'editor' }),
    })
    setUserSearch('')
    setUserResults([])
    setShowAddMember(false)
    setAddingMember(false)
    loadMembers()
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the project?')) return
    await fetch(`/api/projects/${id}/members?user_id=${userId}`, { method: 'DELETE' })
    loadMembers()
  }

  async function updateDocStatus(docId: string, status: string) {
    await fetch(`/api/projects/${id}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Remove this document?')) return
    await fetch(`/api/projects/${id}/documents/${docId}`, { method: 'DELETE' })
    load()
  }

  async function addDoc() {
    if (!newDocName.trim() || !newDocCode.trim()) return
    setAddingDoc(true)
    await fetch(`/api/projects/${id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annex: activeAnnex, name: newDocName, code: newDocCode }),
    })
    setNewDocName(''); setNewDocCode(''); setShowAddDoc(false)
    setAddingDoc(false)
    load()
  }


  async function saveDocSettings() {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docSettings),
    })
    setShowDocSettings(false)
    load()
  }

  async function updateProjectStatus(status: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#9b9991',fontSize:13}}>Loading...</div>
  if (!project) return null

  const annexDocs = docs.filter((d: any) => d.annex === activeAnnex)
  const annexCounts = ANNEXES.reduce((acc, a) => ({ ...acc, [a]: docs.filter((d:any) => d.annex === a).length }), {} as Record<string,number>)
  const total = docs.length
  const approved = docs.filter((d:any) => d.status === 'approved').length
  const inprog = docs.filter((d:any) => d.status === 'inprogress' || d.status === 'review').length
  const draft = docs.filter((d:any) => d.status === 'draft').length
  const pct = total > 0 ? Math.round((approved/total)*100) : 0
  const ps = PROJ_STATUS[project.status] || PROJ_STATUS.draft

  return (
    <div>
      <div style={{fontSize:12,color:'#9b9991',marginBottom:18,display:'flex',alignItems:'center',gap:5}}>
        <Link href="/dashboard/projects" style={{color:'#9b9991',textDecoration:'none'}}>Projects</Link>
        <span>›</span>
        <span style={{color:'#1a1a18'}}>{project.name}</span>
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
            <button onClick={() => setEditMode(!editMode)} style={{height:30,padding:'0 12px',fontSize:12,background:editMode?'#185FA5':'transparent',border:editMode?'0.5px solid #185FA5':'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,color:editMode?'#fff':'#1a1a18',cursor:'pointer'}}>
              {editMode ? 'Done editing' : 'Edit project'}
            </button>
            <button onClick={() => setShowDocSettings(v => !v)} style={{height:30,padding:'0 12px',fontSize:12,background:showDocSettings?'rgba(78,140,140,0.1)':'transparent',border:showDocSettings?'0.5px solid rgba(78,140,140,0.3)':'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,color:showDocSettings?'#2e5f5f':'#1a1a18',cursor:'pointer'}}>
              Doc settings
            </button>
            <select value={project.status} onChange={e => updateProjectStatus(e.target.value)}
              style={{height:30,padding:'0 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,background:'#fff',cursor:'pointer'}}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="review">Under review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
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
          <div>
            <div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>Approved</div>
            <div style={{fontSize:16,fontWeight:500,color:'#3B6D11'}}>{approved}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>In progress</div>
            <div style={{fontSize:16,fontWeight:500,color:'#BA7517'}}>{inprog}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'#6b6a64',marginBottom:2}}>Draft</div>
            <div style={{fontSize:16,fontWeight:500}}>{draft}</div>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,padding:'14px 20px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500}}>Members</div>
          <button
            onClick={() => setShowAddMember(v => !v)}
            style={{height:26,padding:'0 10px',fontSize:11,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}
          >+ Add member</button>
        </div>

        {/* Add member search */}
        {showAddMember && (
          <div style={{marginBottom:12,position:'relative'}}>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              autoFocus
              style={{
                width:'100%',height:32,padding:'0 10px',fontSize:12,
                border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,
                outline:'none',boxSizing:'border-box' as const,
              }}
            />
            {searchingUsers && (
              <div style={{fontSize:11,color:'#9b9991',padding:'6px 0'}}>Searching…</div>
            )}
            {userResults.length > 0 && (
              <div style={{
                position:'absolute',top:36,left:0,right:0,zIndex:20,
                background:'#fff',border:'0.5px solid rgba(0,0,0,0.15)',
                borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.1)',overflow:'hidden',
              }}>
                {userResults.map(u => {
                  const rs = ROLE_STYLES[u.role] || ROLE_STYLES.client
                  return (
                    <div
                      key={u.id}
                      onClick={() => !addingMember && addMember(u)}
                      style={{
                        padding:'9px 12px',cursor:'pointer',
                        display:'flex',alignItems:'center',gap:10,
                        borderBottom:'0.5px solid rgba(0,0,0,0.06)',
                        background:'#fff',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500}}>{u.name}</div>
                        <div style={{fontSize:11,color:'#9b9991'}}>{u.email}</div>
                      </div>
                      <span style={{
                        fontSize:10,padding:'1px 6px',borderRadius:3,
                        background:rs.bg,color:rs.color,border:`0.5px solid ${rs.border}`,
                      }}>{u.role}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {userSearch && !searchingUsers && userResults.length === 0 && (
              <div style={{fontSize:11,color:'#9b9991',padding:'6px 0'}}>No users found.</div>
            )}
          </div>
        )}

        {/* Member list */}
        {members.length === 0 ? (
          <div style={{fontSize:12,color:'#9b9991'}}>No members yet. Add team members to collaborate on this project.</div>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap' as const,gap:8}}>
            {members.map(m => {
              const rs = ROLE_STYLES[m.user_role] || ROLE_STYLES.client
              return (
                <div key={m.id} style={{
                  display:'flex',alignItems:'center',gap:7,
                  padding:'5px 10px',borderRadius:20,
                  background:'#f8f7f4',border:'0.5px solid rgba(0,0,0,0.1)',
                }}>
                  <div style={{
                    width:22,height:22,borderRadius:'50%',flexShrink:0,
                    background:rs.bg,color:rs.color,border:`0.5px solid ${rs.border}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:9,fontWeight:600,
                  }}>
                    {m.name.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:500}}>{m.name}</div>
                    <div style={{fontSize:10,color:'#9b9991'}}>{m.user_role}</div>
                  </div>
                  <button
                    onClick={() => removeMember(m.user_id)}
                    style={{background:'none',border:'none',color:'#9b9991',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 2px',marginLeft:2}}
                    title="Remove member"
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Annex + docs grid */}

      {/* Document settings panel */}
      {showDocSettings && (
        <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,padding:'16px 20px',marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14,color:'#1a1f24'}}>Document header &amp; footer settings</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#5a6472',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Footer</div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:12,color:'#5a6472',marginBottom:4,display:'block'}}>Confidentiality text</label>
                <input value={docSettings.footer_confidentiality} onChange={e => setDocSettings(s => ({...s, footer_confidentiality: e.target.value}))}
                  style={{width:'100%',height:32,padding:'0 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.18)',borderRadius:6,outline:'none'}} />
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  {key:'footer_show_version', label:'Show version'},
                  {key:'footer_show_date', label:'Show date'},
                  {key:'footer_show_page_numbers', label:'Show page numbers'},
                ].map(({key, label}) => (
                  <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#2e3640',cursor:'pointer'}}>
                    <input type="checkbox" checked={docSettings[key as keyof typeof docSettings] as boolean}
                      onChange={e => setDocSettings(s => ({...s, [key]: e.target.checked}))}
                      style={{width:14,height:14,cursor:'pointer'}} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#5a6472',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Header preview</div>
              <div style={{border:'1px solid #e0ddd8',borderRadius:6,padding:'10px 14px',background:'#faf9f7',fontSize:11}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:8,borderBottom:'1px solid #e0ddd8',marginBottom:8}}>
                  <span style={{color:'#8a96a2'}}>[LOGO]</span>
                  <span style={{fontWeight:600,color:'#2e3640'}}>Document name</span>
                  <span style={{color:'#5a6472',fontFamily:'monospace'}}>DOC-001</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',color:'#8a96a2'}}>
                  <span>{docSettings.footer_show_version ? 'v1 · ' : ''}{docSettings.footer_confidentiality}</span>
                  <span>{docSettings.footer_show_date ? new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : ''}</span>
                  <span>{docSettings.footer_show_page_numbers ? 'Page 1 of N' : ''}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
            <button onClick={() => setShowDocSettings(false)} style={{height:30,padding:'0 14px',fontSize:12,cursor:'pointer',background:'none',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,color:'#5a6472'}}>Cancel</button>
            <button onClick={saveDocSettings} style={{height:30,padding:'0 14px',fontSize:12,cursor:'pointer',background:'#4e8c8c',border:'none',borderRadius:6,color:'#fff',fontWeight:500}}>Save settings</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'176px minmax(0,1fr)',gap:14}}>
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
              <span style={{fontSize:11,borderRadius:20,padding:'1px 6px',background:a===activeAnnex?'#B5D4F4':'#f1efe8',color:a===activeAnnex?'#0C447C':'#9b9991'}}>
                {annexCounts[a]||0}
              </span>
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
              <button onClick={() => setShowAddDoc(true)} style={{height:28,padding:'0 10px',fontSize:12,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}>
                + Add document
              </button>
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
              <div key={d.id} style={{
                padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',
                display:'flex',alignItems:'center',gap:10,
                background: isReview ? '#FFFBF5' : '#fff',
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{d.name}</div>
                  <div style={{fontSize:11,color:'#9b9991',fontFamily:'monospace',marginTop:1}}>{d.code}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                  {editMode ? (
                    <>
                      <select value={d.status} onChange={e => updateDocStatus(d.id, e.target.value)}
                        style={{height:26,padding:'0 6px',fontSize:11,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,background:'#fff'}}>
                        <option value="draft">Draft</option>
                        <option value="inprogress">In progress</option>
                        <option value="review">In review</option>
                        <option value="approved">Approved</option>
                      </select>
                      <button onClick={() => deleteDoc(d.id)} style={{height:26,padding:'0 8px',fontSize:11,background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:6,color:'#A32D2D',cursor:'pointer'}}>Remove</button>
                    </>
                  ) : (
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`}}>
                      {isReview ? '⏳ ' : ''}{s.label}
                    </span>
                  )}
                  <Link href={`/dashboard/projects/${id}/documents/${d.id}`} style={{height:26,padding:'0 10px',fontSize:11,background:'#E6F1FB',border:'0.5px solid #85B7EB',borderRadius:6,color:'#185FA5',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                    Open
                  </Link>
                </div>
              </div>
            )
          })}

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
    </div>
  )
}
