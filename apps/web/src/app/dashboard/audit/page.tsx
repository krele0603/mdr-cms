'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AuditEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  metadata: Record<string, any>
  created_at: string
  user_name: string | null
  user_email: string | null
  user_role: string | null
}

interface Filters {
  entityTypes: string[]
  actions: string[]
  users: { id: string; name: string }[]
}

const ENTITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  project:       { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  document:      { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  user:          { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  eqms_document: { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  template:      { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' },
  list:          { bg: '#FDECEA', color: '#7C1C0C', border: '#EB8585' },
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  created:    { bg: '#EAF3DE', color: '#27500A' },
  updated:    { bg: '#E6F1FB', color: '#0C447C' },
  deleted:    { bg: '#FDECEA', color: '#7C1C0C' },
  approved:   { bg: '#EAF3DE', color: '#27500A' },
  submitted:  { bg: '#FAEEDA', color: '#633806' },
  revised:    { bg: '#EEEDFE', color: '#3C3489' },
  status_changed: { bg: '#FAEEDA', color: '#633806' },
  content_saved:  { bg: '#F1EFE8', color: '#5F5E5A' },
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatEntityType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function MetadataChips({ meta }: { meta: Record<string, any> }) {
  const entries = Object.entries(meta).filter(([k]) => !['content'].includes(k))
  if (entries.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f5f2ee', color: '#5a6472', border: '0.5px solid #e0ddd8' }}>
          {k}: <strong>{String(v)}</strong>
        </span>
      ))}
    </div>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [filters, setFilters] = useState<Filters>({ entityTypes: [], actions: [], users: [] })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  // Filter state
  const [filterEntity, setFilterEntity] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    const p = new URLSearchParams({ limit: String(LIMIT), offset: String(off) })
    if (filterEntity) p.set('entity_type', filterEntity)
    if (filterAction) p.set('action', filterAction)
    if (filterUser)   p.set('user_id', filterUser)
    const res = await fetch(`/api/audit?${p}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setFilters(data.filters)
    }
    setLoading(false)
  }, [filterEntity, filterAction, filterUser])

  useEffect(() => { setOffset(0); load(0) }, [filterEntity, filterAction, filterUser])

  function changePage(newOffset: number) {
    setOffset(newOffset)
    load(newOffset)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  const selectStyle: React.CSSProperties = {
    height: 32, padding: '0 10px', fontSize: 12,
    border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6,
    background: '#fff', cursor: 'pointer', color: '#2e3640', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a96a2', marginBottom: 10 }}>
          <Link href="/dashboard" style={{ color: '#8a96a2', textDecoration: 'none' }}>Dashboard</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24' }}>Audit Trail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: '0 0 4px' }}>Audit Trail</h1>
            <div style={{ fontSize: 13, color: '#8a96a2' }}>{total} total event{total !== 1 ? 's' : ''} recorded</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          {filters.entityTypes.map(t => <option key={t} value={t}>{formatEntityType(t)}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={selectStyle}>
          <option value="">All actions</option>
          {filters.actions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={selectStyle}>
          <option value="">All users</option>
          {filters.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {(filterEntity || filterAction || filterUser) && (
          <button onClick={() => { setFilterEntity(''); setFilterAction(''); setFilterUser('') }}
            style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Log table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 130px 1fr 100px', gap: 0, padding: '8px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
          {['Time', 'Type', 'Action', 'Details', 'User'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 14, color: '#5a6472', marginBottom: 4 }}>No events recorded yet</div>
            <div style={{ fontSize: 12, color: '#9b9991' }}>Actions will appear here as users interact with the system.</div>
          </div>
        ) : logs.map((log, idx) => {
          const ec = ENTITY_COLORS[log.entity_type] || ENTITY_COLORS.template
          const ac = ACTION_COLORS[log.action] || { bg: '#F1EFE8', color: '#5F5E5A' }
          return (
            <div key={log.id} style={{
              display: 'grid', gridTemplateColumns: '160px 120px 130px 1fr 100px',
              gap: 0, padding: '10px 16px', alignItems: 'start',
              borderBottom: idx < logs.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
              background: idx % 2 === 0 ? '#fff' : '#faf9f7',
            }}>
              {/* Time */}
              <div>
                <div style={{ fontSize: 12, color: '#1a1f24' }}>
                  {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: '#8a96a2' }}>
                  {new Date(log.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div style={{ fontSize: 10, color: '#b0b8c0', marginTop: 1 }}>{timeAgo(log.created_at)}</div>
              </div>

              {/* Entity type */}
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: ec.bg, color: ec.color, border: `0.5px solid ${ec.border}`, fontWeight: 500 }}>
                  {formatEntityType(log.entity_type)}
                </span>
              </div>

              {/* Action */}
              <div style={{ paddingTop: 1 }}>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: ac.bg, color: ac.color, fontWeight: 500 }}>
                  {formatAction(log.action)}
                </span>
              </div>

              {/* Details / metadata */}
              <div>
                {log.metadata?.name && (
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1f24', marginBottom: 2 }}>{log.metadata.name}</div>
                )}
                {log.metadata?.title && (
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1f24', marginBottom: 2 }}>{log.metadata.title}</div>
                )}
                {log.metadata?.project_name && !log.metadata?.name && (
                  <div style={{ fontSize: 11, color: '#5a6472', marginBottom: 2 }}>{log.metadata.project_name}</div>
                )}
                <MetadataChips meta={log.metadata} />
                <div style={{ fontSize: 10, color: '#b0b8c0', marginTop: 3, fontFamily: 'monospace' }}>
                  {log.entity_id.slice(0, 8)}…
                </div>
              </div>

              {/* User */}
              <div>
                {log.user_name ? (
                  <>
                    <div style={{ fontSize: 12, color: '#1a1f24', fontWeight: 500 }}>{log.user_name}</div>
                    <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 1 }}>{log.user_role}</div>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#b0b8c0' }}>System</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#8a96a2' }}>
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => changePage(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, cursor: offset === 0 ? 'default' : 'pointer', color: offset === 0 ? '#ccc' : '#5a6472' }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: '#5a6472', alignSelf: 'center', padding: '0 6px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button onClick={() => changePage(offset + LIMIT)} disabled={offset + LIMIT >= total}
              style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, cursor: offset + LIMIT >= total ? 'default' : 'pointer', color: offset + LIMIT >= total ? '#ccc' : '#5a6472' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
