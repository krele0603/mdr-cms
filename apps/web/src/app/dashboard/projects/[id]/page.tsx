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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAnnex, setActiveAnnex] = useState('Annex I')
  const [editMode, setEditMode] = useState(false)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocCode, setNewDocCode] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)

  async function load() {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { router.push('/dashboard/projects'); return }
    const data = await res.json()
    setProject(data.project)
    setDocs(data.docs)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

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
            return (
              <div key={d.id} style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10}}>
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
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`}}>{s.label}</span>
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
