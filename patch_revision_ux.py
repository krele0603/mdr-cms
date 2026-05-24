#!/usr/bin/env python3
"""
Patches:
  1. revise/route.ts       — auto-create STED draft when an annex doc is revised
  2. projects/[id]/page.tsx — annex list groups by doc, shows approved+draft row
                              STED section shows two buttons when both exist
  3. doc page              — revision pill in toolbar with dropdown
                              history loaded on mount (not gated behind comments panel)

Run from repo root:
  python3 patches/patch_revision_ux.py
"""

import sys

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — revise/route.ts: auto-create STED draft when annex doc is revised
# ══════════════════════════════════════════════════════════════════════════════
F1 = 'apps/web/src/app/api/projects/[id]/documents/[docId]/revise/route.ts'
with open(F1) as f: s1 = f.read()

OLD1 = """  await query(
    `INSERT INTO document_history (document_id, user_id, action, note) VALUES ($1::uuid, $2::uuid, 'revised', $3)`,
    [newDoc.id, userId, `Revision ${nextRevision} created from approved rev.${doc.revision || 1}`]
  )

  return NextResponse.json(newDoc, { status: 201 })
}"""

NEW1 = """  await query(
    `INSERT INTO document_history (document_id, user_id, action, note) VALUES ($1::uuid, $2::uuid, 'revised', $3)`,
    [newDoc.id, userId, `Revision ${nextRevision} created from approved rev.${doc.revision || 1}`]
  )

  // If this is an annex doc (not STED) and the STED is currently approved,
  // auto-create a STED draft so it's ready to be updated for the new TF version.
  if (doc.annex !== 'STED') {
    const approvedSted = await queryOne(
      `SELECT * FROM project_documents
       WHERE project_id = $1::uuid AND annex = 'STED' AND status = 'approved'`,
      [projectId]
    )
    const stedDraftExists = approvedSted ? await queryOne(
      `SELECT id FROM project_documents
       WHERE project_id = $1::uuid AND annex = 'STED'
         AND status NOT IN ('approved','superseded','obsolete')`,
      [projectId]
    ) : null

    if (approvedSted && !stedDraftExists) {
      // Supersede the approved STED and create a new draft
      await query(
        `UPDATE project_documents SET status = 'superseded', updated_at = NOW() WHERE id = $1::uuid`,
        [approvedSted.id]
      )
      const stedNext = (approvedSted.revision || 1) + 1
      const newSted = await queryOne(
        `INSERT INTO project_documents
           (project_id, list_document_id, annex, name, code, content, template_version_id, status, revision)
         VALUES ($1::uuid, $2, 'STED', $3, $4, $5, $6, 'draft', $7)
         RETURNING id`,
        [projectId, approvedSted.list_document_id || null, approvedSted.name,
         approvedSted.code, approvedSted.content, approvedSted.template_version_id || null, stedNext]
      )
      await query(
        `INSERT INTO document_history (document_id, user_id, action, note) VALUES ($1::uuid, $2::uuid, 'revised', $3)`,
        [newSted!.id, userId, `STED auto-opened for revision after ${doc.name} was revised`]
      )
    }
  }

  return NextResponse.json(newDoc, { status: 201 })
}"""

if OLD1 not in s1:
    errors.append('FILE1 (auto STED draft): target not found')
elif s1.count(OLD1) > 1:
    errors.append('FILE1 (auto STED draft): found more than once')
else:
    s1 = s1.replace(OLD1, NEW1, 1)
    print('FILE1 PATCH applied: auto-create STED draft on revise')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — project page: STED dual buttons + annex list groups by doc
# ══════════════════════════════════════════════════════════════════════════════
F2 = 'apps/web/src/app/dashboard/projects/[id]/page.tsx'
with open(F2) as f: s2 = f.read()

# 2A — add stedDraft derived var next to stedDoc
OLD2A = "  const stedDoc = docs.find((d: any) => d.annex === 'STED')"
NEW2A = """  const stedDoc = docs.find((d: any) => d.annex === 'STED' && d.status === 'approved')
  const stedDraft = docs.find((d: any) => d.annex === 'STED' && !['approved','superseded','obsolete'].includes(d.status))
  const stedDisplay = stedDraft || stedDoc  // primary display doc"""

if OLD2A not in s2:
    errors.append('FILE2A (stedDraft var): target not found')
elif s2.count(OLD2A) > 1:
    errors.append('FILE2A (stedDraft var): found more than once')
else:
    s2 = s2.replace(OLD2A, NEW2A, 1)
    print('FILE2A PATCH applied: stedDraft derived var')

# 2B — fix references that used stedDoc for status checks
OLD2B = "  const tfApproved = stedDoc?.status === 'approved'\n  const readyForTfApproval = allAnnexesApproved && stedDoc?.status === 'review'"
NEW2B = "  const tfApproved = stedDoc != null  // stedDoc is already filtered to approved\n  const readyForTfApproval = allAnnexesApproved && (stedDraft?.status === 'review')"

if OLD2B not in s2:
    errors.append('FILE2B (tfApproved fix): target not found')
elif s2.count(OLD2B) > 1:
    errors.append('FILE2B (tfApproved fix): found more than once')
else:
    s2 = s2.replace(OLD2B, NEW2B, 1)
    print('FILE2B PATCH applied: tfApproved uses stedDoc filter')

# 2C — STED section: dual buttons
OLD2C = """      {stedDoc && (() => {
        const s = DOC_STATUS[stedDoc.status] || DOC_STATUS.draft
        const isApproved = stedDoc.status === 'approved'
        const isReview = stedDoc.status === 'review'
        return (
          <div style={{marginBottom:14,border:`1.5px solid ${isApproved ? '#97C459' : isReview ? '#FAC775' : 'rgba(0,0,0,0.12)'}`,borderRadius:12,overflow:'hidden',background:isApproved?'#F4FAE8':isReview?'#FFFBF5':'#fff'}}>
            <div style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:8,flexShrink:0,background:'#FFF3CD',color:'#856404',border:'0.5px solid #FFEEBA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,textAlign:'center' as const,lineHeight:1.2}}>STED</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1f24',marginBottom:2}}>Summary of Technical Documentation</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>\n                  <span style={{fontSize:10,color:'#9b9991',fontFamily:'monospace'}}>{stedDoc.code}</span>
                  <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`,fontWeight:500}}>{s.label}</span>
                  {isApproved && <span style={{fontSize:10,color:'#3B6D11',fontWeight:500}}>✓ TF Approved</span>}
                </div>
              </div>
              <button onClick={() => router.push(`/dashboard/projects/${id}/documents/${stedDoc.id}`)}\n                style={{height:30,padding:'0 14px',fontSize:12,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer',fontWeight:500,flexShrink:0}}>
                {isApproved ? 'View' : 'Edit'} STED →
              </button>
            </div>
          </div>
        )
      })()}"""

NEW2C = """      {(stedDoc || stedDraft) && (() => {
        const displayDoc = stedDraft || stedDoc!
        const s = DOC_STATUS[displayDoc.status] || DOC_STATUS.draft
        const hasBoth = stedDoc && stedDraft
        return (
          <div style={{marginBottom:14,border:`1.5px solid ${stedDoc && !stedDraft ? '#97C459' : stedDraft?.status === 'review' ? '#FAC775' : 'rgba(0,0,0,0.12)'}`,borderRadius:12,overflow:'hidden',background: stedDoc && !stedDraft ? '#F4FAE8' : stedDraft?.status === 'review' ? '#FFFBF5' : '#fff'}}>
            <div style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:8,flexShrink:0,background:'#FFF3CD',color:'#856404',border:'0.5px solid #FFEEBA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,textAlign:'center' as const,lineHeight:1.2}}>STED</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1f24',marginBottom:2}}>Summary of Technical Documentation</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:10,color:'#9b9991',fontFamily:'monospace'}}>{displayDoc.code}</span>
                  {stedDoc && !stedDraft && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:'#EAF3DE',color:'#27500A',border:'0.5px solid #97C459',fontWeight:500}}>✓ TF Approved</span>}
                  {stedDraft && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`,fontWeight:500}}>{s.label}</span>}
                  {hasBoth && <span style={{fontSize:10,color:'#856404',fontWeight:500}}>· approved version also available</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:7,flexShrink:0}}>
                {hasBoth && (
                  <button onClick={() => router.push(`/dashboard/projects/${id}/documents/${stedDoc!.id}`)}
                    style={{height:30,padding:'0 12px',fontSize:12,background:'transparent',border:'0.5px solid #97C459',borderRadius:6,color:'#27500A',cursor:'pointer',fontWeight:500}}>
                    ✓ Approved
                  </button>
                )}
                <button onClick={() => router.push(`/dashboard/projects/${id}/documents/${stedDraft ? stedDraft.id : stedDoc!.id}`)}
                  style={{height:30,padding:'0 14px',fontSize:12,background:'#185FA5',border:'none',borderRadius:6,color:'#fff',cursor:'pointer',fontWeight:500}}>
                  {stedDraft ? (stedDraft.status === 'review' ? '⏳ In review' : '✎ Edit draft') : 'View STED'} →
                </button>
              </div>
            </div>
          </div>
        )
      })()}"""

if OLD2C not in s2:
    errors.append('FILE2C (STED dual buttons): target not found')
elif s2.count(OLD2C) > 1:
    errors.append('FILE2C (STED dual buttons): found more than once')
else:
    s2 = s2.replace(OLD2C, NEW2C, 1)
    print('FILE2C PATCH applied: STED dual buttons')

# 2D — annex doc list: group by name+code, show approved+draft in one row
OLD2D = """          {annexDocs.length === 0 && !showAddDoc ? (
            <div style={{padding:36,textAlign:'center',color:'#9b9991',fontSize:13}}>
              No documents in {activeAnnex}.{editMode?' Click \"Add document\" to add one.':''}
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
                      <option value=\"draft\">Draft</option>
                      <option value=\"inprogress\">In progress</option>
                      <option value=\"review\">In review</option>
                      <option value=\"approved\">Approved</option>
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
          })}"""

NEW2D = """          {annexDocs.length === 0 && !showAddDoc ? (
            <div style={{padding:36,textAlign:'center',color:'#9b9991',fontSize:13}}>
              No documents in {activeAnnex}.{editMode?' Click \"Add document\" to add one.':''}
            </div>
          ) : (() => {
            // Group by name+code — show one row per document with approved+draft slots
            const groups: Record<string, {approved:any,draft:any}> = {}
            for (const d of annexDocs) {
              const key = `${d.code}||${d.name}`
              if (!groups[key]) groups[key] = { approved: null, draft: null }
              if (d.status === 'approved') groups[key].approved = d
              else groups[key].draft = d
            }
            return Object.values(groups).map((g) => {
              const primary = g.draft || g.approved
              const s = DOC_STATUS[primary.status] || DOC_STATUS.draft
              const isReview = primary.status === 'review'
              const hasBoth = g.approved && g.draft
              return (
                <div key={primary.id} style={{padding:'11px 14px',borderBottom:'0.5px solid rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:10,background:isReview?'#FFFBF5':'#fff'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{primary.name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                      <span style={{fontSize:11,color:'#9b9991',fontFamily:'monospace'}}>{primary.code}</span>
                      {!editMode && (
                        <>
                          {g.approved && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:'#EAF3DE',color:'#27500A',border:'0.5px solid #97C459',fontWeight:500}}>✓ rev.{g.approved.revision||1}</span>}
                          {g.draft && <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:s.bg,color:s.color,border:`0.5px solid ${s.border}`,fontWeight:500}}>{isReview?'⏳ ':''}{s.label} rev.{g.draft.revision||1}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    {editMode ? (
                      <select value={primary.status} onChange={e => updateDocStatus(primary.id, e.target.value)}
                        style={{height:26,padding:'0 6px',fontSize:11,border:'0.5px solid rgba(0,0,0,0.2)',borderRadius:6,background:'#fff'}}>
                        <option value=\"draft\">Draft</option>
                        <option value=\"inprogress\">In progress</option>
                        <option value=\"review\">In review</option>
                        <option value=\"approved\">Approved</option>
                      </select>
                    ) : null}
                    {hasBoth && (
                      <Link href={`/dashboard/projects/${id}/documents/${g.approved.id}`}
                        style={{height:26,padding:'0 10px',fontSize:11,background:'transparent',border:'0.5px solid #97C459',borderRadius:6,color:'#27500A',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                        Approved
                      </Link>
                    )}
                    <Link href={`/dashboard/projects/${id}/documents/${g.draft ? g.draft.id : g.approved.id}`}
                      style={{height:26,padding:'0 10px',fontSize:11,background:'#E6F1FB',border:'0.5px solid #85B7EB',borderRadius:6,color:'#185FA5',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                      {g.draft ? 'Edit' : 'Open'}
                    </Link>
                    {sessionRole === 'admin' && !g.draft && (
                      <button onClick={() => deleteDoc(g.approved.id, g.approved.name)} style={{height:26,padding:'0 8px',fontSize:11,background:'#FCEBEB',border:'0.5px solid #F09595',borderRadius:6,color:'#A32D2D',cursor:'pointer'}}>Delete</button>
                    )}
                  </div>
                </div>
              )
            })
          })()}"""

if OLD2D not in s2:
    errors.append('FILE2D (annex doc groups): target not found')
elif s2.count(OLD2D) > 1:
    errors.append('FILE2D (annex doc groups): found more than once')
else:
    s2 = s2.replace(OLD2D, NEW2D, 1)
    print('FILE2D PATCH applied: annex list groups approved+draft')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 3 — doc page: revision pill in toolbar + history on mount
# ══════════════════════════════════════════════════════════════════════════════
F3 = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(F3) as f: s3 = f.read()

# 3A — add docRevisions state + showRevPill dropdown
OLD3A = """  const [allRevisions, setAllRevisions] = useState<any[]>([])
  const [showRevisionDropdown, setShowRevisionDropdown] = useState(false)"""
NEW3A = """  const [allRevisions, setAllRevisions] = useState<any[]>([])
  const [showRevisionDropdown, setShowRevisionDropdown] = useState(false)
  const [docRevisions, setDocRevisions] = useState<any[]>([])
  const [showRevPill, setShowRevPill] = useState(false)"""

if OLD3A not in s3:
    errors.append('FILE3A (docRevisions state): target not found')
elif s3.count(OLD3A) > 1:
    errors.append('FILE3A (docRevisions state): found more than once')
else:
    s3 = s3.replace(OLD3A, NEW3A, 1)
    print('FILE3A PATCH applied: docRevisions state')

# 3B — fetch docRevisions + history on mount (not gated behind comments)
OLD3B = """    fetch(`/api/projects/${projectId}/tf-revision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLatestRevision(d) })
    fetch(`/api/projects/${projectId}/tf-revision?all=1`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAllRevisions(d) })"""

NEW3B = """    fetch(`/api/projects/${projectId}/tf-revision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLatestRevision(d) })
    fetch(`/api/projects/${projectId}/tf-revision?all=1`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAllRevisions(d) })
    fetch(`/api/projects/${projectId}/documents/${docId}/revisions`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setDocRevisions(d) })
    fetch(`/api/projects/${projectId}/documents/${docId}/history`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setHistory(d) })"""

if OLD3B not in s3:
    errors.append('FILE3B (fetch docRevisions+history): target not found')
elif s3.count(OLD3B) > 1:
    errors.append('FILE3B (fetch docRevisions+history): found more than once')
else:
    s3 = s3.replace(OLD3B, NEW3B, 1)
    print('FILE3B PATCH applied: fetch docRevisions and history on mount')

# 3C — add revision pill after doc name in toolbar breadcrumb
OLD3C = """          <span style={{ color: '#1a1f24', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.name}{doc.revision && doc.revision > 1 ? ` (rev.${doc.revision})` : ''}</span>"""

NEW3C = """          <span style={{ color: '#1a1f24', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.name}</span>
          {docRevisions.length > 0 && (() => {
            const total = docRevisions.length
            const currentIdx = docRevisions.findIndex((r:any) => r.id === docId)
            const statusColors: Record<string,string> = { approved:'#27500A', draft:'#5a6472', inprogress:'#8a6020', review:'#0C447C', superseded:'#8a96a2', obsolete:'#943030' }
            const statusLabels: Record<string,string> = { approved:'✓ Approved', draft:'Draft', inprogress:'In progress', review:'In review', superseded:'Superseded', obsolete:'Obsolete' }
            return (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowRevPill(v => !v)}
                  style={{ height: 20, padding: '0 8px', fontSize: 11, background: '#f0ede8', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, color: statusColors[docStatus] || '#5a6472', cursor: total > 1 ? 'pointer' : 'default', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                  rev.{doc.revision || 1}{total > 1 ? ` of ${total}` : ''} · {statusLabels[docStatus] || docStatus}{total > 1 ? <span style={{fontSize:8,opacity:0.6}}>▼</span> : null}
                </button>
                {showRevPill && total > 1 && (
                  <div style={{ position: 'absolute', top: 24, left: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 220, padding: '4px 0' }}
                    onMouseLeave={() => setShowRevPill(false)}>
                    <div style={{ padding: '5px 12px 3px', fontSize: 10, color: '#9b9991', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All revisions</div>
                    {[...docRevisions].reverse().map((r:any) => {
                      const isCurrent = r.id === docId
                      return (
                        <a key={r.id} href={`/dashboard/projects/${projectId}/documents/${r.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', textDecoration: 'none', background: isCurrent ? '#f0ede8' : 'transparent' }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#f5f2ee' }}
                          onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: isCurrent ? 600 : 400, color: '#2e3640', minWidth: 36 }}>rev.{r.revision || 1}</span>
                          <span style={{ fontSize: 11, color: statusColors[r.status] || '#5a6472', flex: 1 }}>{statusLabels[r.status] || r.status}</span>
                          {isCurrent && <span style={{ fontSize: 10, color: '#8a96a2' }}>← current</span>}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}"""

if OLD3C not in s3:
    errors.append('FILE3C (revision pill): target not found')
elif s3.count(OLD3C) > 1:
    errors.append('FILE3C (revision pill): found more than once')
else:
    s3 = s3.replace(OLD3C, NEW3C, 1)
    print('FILE3C PATCH applied: revision pill with dropdown')

# ══════════════════════════════════════════════════════════════════════════════
# Write
# ══════════════════════════════════════════════════════════════════════════════
if errors:
    print('\nERRORS — no files written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F1, 'w') as f: f.write(s1)
print(f'Wrote {F1}')
with open(F2, 'w') as f: f.write(s2)
print(f'Wrote {F2}')
with open(F3, 'w') as f: f.write(s3)
print(f'Wrote {F3}')
print('\nOK: all patches applied')
