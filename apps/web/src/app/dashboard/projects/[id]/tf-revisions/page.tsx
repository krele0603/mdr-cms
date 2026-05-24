'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const ANNEX_ORDER = ['STED','Annex I','Annex II','Annex III','Annex IV','Annex V',
                     'Annex VI','Annex VII','Annex VIII','Annex IX','Annex X']

export default function TFRevisionsPage() {
  const { id } = useParams() as { id: string }
  const [revisions, setRevisions] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [revDocMap, setRevDocMap] = useState<Record<string, any[]>>({})
  const [loadingDocs, setLoadingDocs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => setProjectName(d.project?.name || d.name || ''))
    fetch(`/api/projects/${id}/tf-revision?all=1`)
      .then(r => r.json())
      .then(d => { setRevisions(Array.isArray(d) ? d : []); setLoading(false) })
  }, [id])

  async function loadRevisionDocs(revId: string) {
    if (revDocMap[revId] !== undefined) return
    setLoadingDocs(prev => ({ ...prev, [revId]: true }))
    const res = await fetch(`/api/projects/${id}/tf-revision/${revId}`)
    const data = await res.json()
    setRevDocMap(prev => ({ ...prev, [revId]: data.documents || [] }))
    setLoadingDocs(prev => ({ ...prev, [revId]: false }))
  }

  function toggleExpand(revId: string) {
    if (expanded === revId) { setExpanded(null); return }
    setExpanded(revId)
    loadRevisionDocs(revId)
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/projects" style={{ color: '#9b9991', textDecoration: 'none' }}>Projects</Link>
        <span>›</span>
        <Link href={`/dashboard/projects/${id}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{projectName}</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>TF Revision History</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 3 }}>TF Revision History</h1>
          <div style={{ fontSize: 13, color: '#6b6a64' }}>{revisions.length} revision{revisions.length !== 1 ? 's' : ''}</div>
        </div>
        <Link href={`/dashboard/projects/${id}`}
          style={{ height: 32, padding: '0 14px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, color: '#5a6472', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          ← Back to project
        </Link>
      </div>

      {revisions.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9b9991', fontSize: 13, background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)' }}>
          No TF revisions have been approved yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisions.map((rev, i) => {
            const isOpen = expanded === rev.id
            const docs: any[] = revDocMap[rev.id] || []
            const isLoadingDocs = loadingDocs[rev.id]
            const isLatest = i === 0

            // Group docs by annex in defined order
            const byAnnex = ANNEX_ORDER
              .map(a => ({ annex: a, docs: docs.filter(d => d.annex === a) }))
              .filter(g => g.docs.length > 0)

            return (
              <div key={rev.id} style={{
                background: '#fff',
                border: isLatest ? '1.5px solid #97C459' : '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                {/* Row header */}
                <div
                  onClick={() => toggleExpand(rev.id)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, userSelect: 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: isLatest ? '#27500A' : '#2e3640', minWidth: 64 }}>
                    v{rev.version}
                  </span>

                  {isLatest && (
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #97C459', fontWeight: 600, flexShrink: 0 }}>
                      LATEST
                    </span>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rev.notes && (
                      <div style={{ fontSize: 12, color: '#3a3a36', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rev.notes}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#9b9991' }}>
                      Approved by {rev.approved_by_name || 'Unknown'} · {new Date(rev.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <span style={{ fontSize: 18, color: '#9b9991', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>›</span>
                </div>

                {/* Expanded snapshot */}
                {isOpen && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '4px 18px 18px' }}>
                    {isLoadingDocs ? (
                      <div style={{ padding: '16px 0', color: '#9b9991', fontSize: 12 }}>Loading snapshot…</div>
                    ) : byAnnex.length === 0 ? (
                      <div style={{ padding: '16px 0', color: '#9b9991', fontSize: 12 }}>No snapshot data available.</div>
                    ) : (
                      byAnnex.map(group => (
                        <div key={group.annex} style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a64', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {group.annex}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px', color: '#9b9991', fontWeight: 500, width: '28%' }}>Code</th>
                                <th style={{ textAlign: 'left', padding: '4px 8px', color: '#9b9991', fontWeight: 500 }}>Name</th>
                                <th style={{ textAlign: 'right', padding: '4px 8px', color: '#9b9991', fontWeight: 500, width: 52 }}>Rev</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.docs.map((d: any, di: number) => (
                                <tr key={di} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#5a6472', fontSize: 11 }}>{d.document_code}</td>
                                  <td style={{ padding: '5px 8px', color: '#2e3640' }}>{d.document_name}</td>
                                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#9b9991' }}>rev.{d.document_revision || 1}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
