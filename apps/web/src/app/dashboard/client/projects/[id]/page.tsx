'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function ClientProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAnnex, setActiveAnnex] = useState('Annex I')

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setProject(data.project)
        setDocs(data.docs)
        setLoading(false)
        // Auto-select first annex that has documents
        const firstWithDocs = ANNEXES.find(a => data.docs.some((d: any) => d.annex === a))
        if (firstWithDocs) setActiveAnnex(firstWithDocs)
      })
      .catch(() => router.push('/dashboard/client'))
  }, [id])

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
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0
  const ps = PROJ_STATUS[project.status] || PROJ_STATUS.draft

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/client" style={{ color: '#9b9991', textDecoration: 'none' }}>My Projects</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>{project.name}</span>
      </div>

      {/* Project header */}
      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 2 }}>{project.name}</div>
            <div style={{ fontSize: 13, color: '#6b6a64' }}>{project.device_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' as const, marginTop: 8 }}>
              {project.list_name && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB' }}>
                  {project.list_name}
                </span>
              )}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: ps.bg, color: ps.color, border: `0.5px solid ${ps.border}` }}>
                {ps.label}
              </span>
              <span style={{ fontSize: 11, color: '#9b9991' }}>
                {project.manufacturer_name}
              </span>
            </div>
          </div>

          {/* Progress summary */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: pct === 100 ? '#27500A' : '#1a1a18' }}>{pct}%</div>
            <div style={{ fontSize: 11, color: '#9b9991', marginBottom: 6 }}>{approved} / {total} approved</div>
            <div style={{ height: 4, width: 120, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#3B6D11' : '#185FA5', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Annex + docs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '176px minmax(0,1fr)', gap: 14 }}>
        {/* Annex sidebar */}
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          {ANNEXES.map(a => {
            const count = annexCounts[a] || 0
            const active = a === activeAnnex
            return (
              <div
                key={a}
                onClick={() => setActiveAnnex(a)}
                style={{
                  padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                  borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                  background: active ? '#E6F1FB' : '#fff',
                  color: active ? '#0C447C' : count === 0 ? '#ccc' : '#1a1a18',
                  fontWeight: active ? 500 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{a}</span>
                <span style={{
                  fontSize: 11, borderRadius: 20, padding: '1px 6px',
                  background: active ? '#B5D4F4' : '#f1efe8',
                  color: active ? '#0C447C' : '#9b9991',
                }}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* Document list */}
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            background: '#f8f7f4',
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{activeAnnex}</div>
            <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>
              {annexDocs.length} document{annexDocs.length !== 1 ? 's' : ''}
            </div>
          </div>

          {annexDocs.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              No documents in {activeAnnex}.
            </div>
          ) : annexDocs.map((d: any) => {
            const s = DOC_STATUS[d.status] || DOC_STATUS.draft
            const isApproved = d.status === 'approved'

            return (
              <div key={d.id} style={{
                padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: isApproved ? '#fcfdfb' : '#fff',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                    color: isApproved ? '#27500A' : '#1a1a18',
                  }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace', marginTop: 1 }}>{d.code}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: s.bg, color: s.color, border: `0.5px solid ${s.border}`,
                  }}>{s.label}</span>

                  {!isApproved && (
                    <Link
                      href={`/dashboard/projects/${id}/documents/${d.id}`}
                      style={{
                        height: 26, padding: '0 10px', fontSize: 11,
                        background: '#185FA5', border: 'none', borderRadius: 6,
                        color: '#fff', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center',
                      }}
                    >Open</Link>
                  )}

                  {isApproved && (
                    <Link
                      href={`/dashboard/projects/${id}/documents/${d.id}`}
                      style={{
                        height: 26, padding: '0 10px', fontSize: 11,
                        background: 'transparent', border: '0.5px solid #97C459', borderRadius: 6,
                        color: '#27500A', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center',
                      }}
                    >View</Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
