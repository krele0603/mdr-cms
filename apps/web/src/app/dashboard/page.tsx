'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  active_projects: number
  total_projects: number
  templates: number
  pending_review: number
  approved_docs: number
  total_docs: number
}

interface Project {
  id: string
  name: string
  device_name: string
  status: string
  total_docs: number
  approved_docs: number
  review_docs: number
  inprogress_docs: number
}

interface AttentionDoc {
  id: string
  name: string
  annex: string
  status: string
  updated_at: string
  project_id: string
  project_name: string
}

const PROJ_STATUS: Record<string, { color: string; label: string }> = {
  draft:    { color: '#8a96a2', label: 'Draft' },
  active:   { color: '#4e8c8c', label: 'Active' },
  review:   { color: '#8a6020', label: 'Under review' },
  approved: { color: '#3a7a5a', label: 'Approved' },
  archived: { color: '#8a96a2', label: 'Archived' },
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function DashboardPage() {
  const [data, setData] = useState<{ stats: Stats; projects: Project[]; needsAttention: AttentionDoc[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#8a96a2', fontSize: 13 }}>
      Loading dashboard…
    </div>
  )

  const s = data?.stats
  const projects = data?.projects || []
  const attention = data?.needsAttention || []

  const statCards = [
    { label: 'Active projects', value: s?.active_projects ?? '—', sub: `${s?.total_projects ?? 0} total`, href: '/dashboard/projects', color: '#4e8c8c', alert: false },
    { label: 'Templates', value: s?.templates ?? '—', sub: 'in library', href: '/dashboard/templates', color: '#2e5f5f', alert: false },
    { label: 'Pending review', value: s?.pending_review ?? '—', sub: 'awaiting review', href: '/dashboard/projects', color: '#8a6020', alert: (s?.pending_review ?? 0) > 0 },
    { label: 'Approved records', value: s?.approved_docs ?? '—', sub: `of ${s?.total_docs ?? 0} total`, href: '/dashboard/projects', color: '#3a7a5a', alert: false },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4, color: '#1a1f24' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#5a6472' }}>Welcome back. Here's what needs your attention.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(st => (
          <Link key={st.label} href={st.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: st.alert ? 'rgba(200,169,110,0.06)' : '#fff',
              border: st.alert ? '0.5px solid rgba(200,169,110,0.5)' : '0.5px solid rgba(0,0,0,0.1)',
              borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{st.label}</div>
              <div style={{ fontSize: 30, fontWeight: 500, color: st.color, lineHeight: 1, marginBottom: 4 }}>{st.value}</div>
              <div style={{ fontSize: 11, color: '#8a96a2' }}>{st.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Projects overview */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Projects</div>
            <Link href="/dashboard/projects" style={{ fontSize: 12, color: '#4e8c8c', textDecoration: 'none' }}>View all →</Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#8a96a2', fontSize: 13 }}>No projects yet.</div>
          ) : projects.map((p, i) => {
            const pct = p.total_docs > 0 ? Math.round((p.approved_docs / p.total_docs) * 100) : 0
            const ps = PROJ_STATUS[p.status] || PROJ_STATUS.draft
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div
                  style={{ padding: '12px 18px', borderBottom: i < projects.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#faf9f7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>{p.device_name}</div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginLeft: 8,
                      background: `${ps.color}18`, color: ps.color, border: `0.5px solid ${ps.color}40`,
                    }}>{ps.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 3, background: '#f5f2ee', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#3a7a5a' : '#4e8c8c', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#8a96a2', flexShrink: 0 }}>{p.approved_docs}/{p.total_docs}</span>
                    {p.review_docs > 0 && (
                      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(200,169,110,0.15)', color: '#8a6020', border: '0.5px solid rgba(200,169,110,0.4)' }}>
                        {p.review_docs} review
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Pending review */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Pending review</div>
            <span style={{ fontSize: 11, color: '#8a96a2' }}>{attention.length} record{attention.length !== 1 ? 's' : ''}</span>
          </div>

          {attention.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#8a96a2', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>✓</div>
              Nothing pending review.
            </div>
          ) : attention.map((doc, i) => (
            <Link key={doc.id} href={`/dashboard/projects/${doc.project_id}/documents/${doc.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div
                style={{ padding: '11px 18px', borderBottom: i < attention.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf9f7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8a96e', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>{doc.project_name} · {doc.annex}</div>
                </div>
                <div style={{ fontSize: 11, color: '#8a96a2', flexShrink: 0 }}>{timeAgo(doc.updated_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
