'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  device_name: string
  manufacturer_name: string
  status: string
  list_name: string | null
  total_docs: number
  approved_docs: number
  review_docs: number
  inprogress_docs: number
}

const PROJ_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Active' },
  review:   { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'Under review' },
  approved: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
  archived: { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7', label: 'Archived' },
}

export default function ClientProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/projects')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setProjects)
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ color: '#9b9991', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
      Loading your projects…
    </div>
  )

  if (error) return (
    <div style={{ color: '#7C1C0C', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
      {error}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>My Projects</h1>
        <div style={{ fontSize: 13, color: '#9b9991' }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''} assigned to you
        </div>
      </div>

      {projects.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#9b9991', fontSize: 13,
        }}>
          No projects assigned yet. Contact your consultant.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projects.map(p => {
          const ps = PROJ_STATUS[p.status] || PROJ_STATUS.draft
          const pct = p.total_docs > 0 ? Math.round((p.approved_docs / p.total_docs) * 100) : 0
          const hasReview = p.review_docs > 0

          return (
            <div
              key={p.id}
              onClick={() => router.push(`/dashboard/client/projects/${p.id}`)}
              style={{
                background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: 12, padding: '16px 20px',
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#6b6a64', marginBottom: 8 }}>{p.device_name}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: ps.bg, color: ps.color, border: `0.5px solid ${ps.border}`,
                    }}>{ps.label}</span>

                    {p.list_name && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: '#E6F1FB', color: '#0C447C', border: '0.5px solid #85B7EB',
                      }}>{p.list_name}</span>
                    )}

                    {hasReview && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: '#FAEEDA', color: '#633806', border: '0.5px solid #FAC775',
                      }}>⏳ {p.review_docs} awaiting review</span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: pct === 100 ? '#27500A' : '#1a1a18' }}>
                    {pct}%
                  </div>
                  <div style={{ fontSize: 11, color: '#9b9991', marginBottom: 6 }}>
                    {p.approved_docs} / {p.total_docs} approved
                  </div>
                  <div style={{ height: 4, width: 100, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 2,
                      background: pct === 100 ? '#3B6D11' : '#185FA5',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
