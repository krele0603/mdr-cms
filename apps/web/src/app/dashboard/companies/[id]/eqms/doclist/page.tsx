'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'

const LEVELS = [
  { level: 1, label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
  { level: 2, label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
  { level: 3, label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  { level: 4, label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775' },
  { level: 5, label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7' },
]

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  pending:  { bg: '#FFFBCC', color: '#7A6500', border: '#F5E24A', label: 'Pending' },
  active:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Active' },
  archived: { bg: '#f5f5f5', color: '#999',    border: '#ddd',    label: 'Archived' },
}

interface DocItem {
  id: string; level: number; code: string | null; title: string
  doc_status: string; version_status: string; version_major: number; version_minor: number
  folder_name: string | null; created_by_name: string | null
  approved_by_name: string | null; approved_at: string | null
  updated_at?: string; created_at?: string; template_title?: string; item_type?: string; file_size?: number
}

export default function EqmsDocListPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<any>(null)
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [records, setRecords] = useState<DocItem[]>([])
  const [files, setFiles] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLevel, setActiveLevel] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [exportLevels, setExportLevels] = useState<number[]>([1,2,3,4,5])
  const [showExportPanel, setShowExportPanel] = useState(false)

  useEffect(() => {
    fetch(`/api/companies/${companyId}`).then(r => r.json()).then(d => setCompany(d.company))
  }, [companyId])

  const loadData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ company_id: companyId })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/eqms/doclist?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents || [])
      setRecords(data.records || [])
      setFiles(data.files || [])
    }
    setLoading(false)
  }, [companyId, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  function getItemsForLevel(level: number): DocItem[] {
    let items: DocItem[] = level === 5
      ? [...records, ...files.map(f => ({ ...f, version_status: 'file', version_major: 0, version_minor: 0 }))]
      : documents.filter(d => d.level === level)

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        (d.folder_name || '').toLowerCase().includes(q)
      )
    }
    return items
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new()
    for (const lv of LEVELS.filter(l => exportLevels.includes(l.level))) {
      const items = getItemsForLevel(lv.level)
      const rows = items.map(d => ({
        'Code':         d.code || '',
        'Title':        d.title,
        'Folder':       d.folder_name || '',
        'Version':      d.version_status === 'file' ? 'File' : `v${d.version_major}.${d.version_minor}`,
        'Status':       d.version_status === 'file' ? 'Uploaded file' : (STATUS_STYLES[d.version_status]?.label || d.version_status),
        'Created by':   d.created_by_name || '',
        'Approved by':  d.approved_by_name || '',
        'Approved at':  d.approved_at ? new Date(d.approved_at).toLocaleDateString('en-GB') : '',
        'Last updated': d.updated_at || d.created_at ? new Date(d.updated_at || d.created_at || '').toLocaleDateString('en-GB') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      // Column widths
      ws['!cols'] = [10, 40, 20, 10, 12, 18, 18, 14, 14].map(w => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws, `L${lv.level} ${lv.label}`)
    }
    const compName = (company?.name || 'company').replace(/[^a-z0-9]/gi, '_')
    XLSX.writeFile(wb, `${compName}_QMS_Document_List.xlsx`)
    setShowExportPanel(false)
  }

  const currentItems = getItemsForLevel(activeLevel)
  const lv = LEVELS.find(l => l.level === activeLevel)!

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#8a96a2', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/companies" style={{ color: '#8a96a2', textDecoration: 'none' }}>Companies</Link>
        <span>›</span>
        <Link href={`/dashboard/companies/${companyId}`} style={{ color: '#8a96a2', textDecoration: 'none' }}>{company?.name || '…'}</Link>
        <span>›</span>
        <span style={{ color: '#1a1f24' }}>Document List</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: '0 0 4px' }}>QMS Document List</h1>
          <div style={{ fontSize: 13, color: '#8a96a2' }}>{company?.name}</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportPanel(v => !v)}
            style={{ height: 36, padding: '0 16px', fontSize: 13, background: '#27500A', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            ↓ Export to Excel
          </button>
          {showExportPanel && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowExportPanel(false)} />
              <div style={{ position: 'absolute', right: 0, top: 42, zIndex: 50, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 16, width: 240 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5a6472', marginBottom: 10 }}>Select levels to export</div>
                {LEVELS.map(l => (
                  <label key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={exportLevels.includes(l.level)}
                      onChange={e => setExportLevels(prev => e.target.checked ? [...prev, l.level] : prev.filter(x => x !== l.level))} />
                    <span style={{ fontSize: 12 }}>Level {l.level} — {l.label}</span>
                  </label>
                ))}
                <button onClick={exportToExcel} disabled={exportLevels.length === 0}
                  style={{ width: '100%', height: 32, marginTop: 8, fontSize: 12, background: '#27500A', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: exportLevels.length === 0 ? 0.5 : 1 }}>
                  Download Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, code, folder…"
          style={{ height: 32, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', width: 240 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 32, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', background: '#fff' }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending approval</option>
          <option value="active">Active (approved)</option>
          <option value="archived">Archived</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }}
            style={{ height: 32, padding: '0 10px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: '#8a96a2', marginLeft: 'auto' }}>{currentItems.length} item{currentItems.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Level tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        {LEVELS.map(l => {
          const count = getItemsForLevel(l.level).length
          const active = activeLevel === l.level
          return (
            <button key={l.level} onClick={() => setActiveLevel(l.level)}
              style={{ height: 38, padding: '0 16px', fontSize: 12, border: 'none', borderBottom: active ? `2px solid ${l.color}` : '2px solid transparent', background: active ? l.bg : 'transparent', color: active ? l.color : '#5a6472', cursor: 'pointer', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
              L{l.level} {l.label}
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: active ? l.color : 'rgba(0,0,0,0.08)', color: active ? '#fff' : '#5a6472' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 90px 100px 130px 130px', gap: 0, padding: '8px 16px', background: '#f8f7f4', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          {['Code', 'Title / Folder', activeLevel === 5 ? 'Template / Type' : 'Version', 'Status', 'Created by', 'Approved by', 'Last updated'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
        ) : currentItems.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
            No documents found{statusFilter ? ` with status "${statusFilter}"` : ''}.
          </div>
        ) : currentItems.map((doc, i) => {
          const ss = STATUS_STYLES[doc.version_status] || STATUS_STYLES.draft
          const isFile = doc.item_type === 'file' || doc.version_status === 'file'
          const href = isFile
            ? `/api/eqms/files/${doc.id}`
            : activeLevel === 5
              ? `/dashboard/companies/${companyId}/documents/${doc.id}`
              : `/dashboard/companies/${companyId}/documents/${doc.id}`
          return (
            <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 90px 100px 130px 130px', gap: 0, padding: '10px 16px', borderBottom: i < currentItems.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', background: i % 2 === 0 ? '#fff' : '#faf9f7' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#faf9f7'}>
              <div style={{ fontSize: 11, color: '#8a96a2', fontFamily: 'monospace' }}>{doc.code || '—'}</div>
              <div>
                {isFile ? (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', textDecoration: 'none' }}>{doc.title}</a>
                ) : (
                  <Link href={href} style={{ fontSize: 13, fontWeight: 500, color: '#1a1f24', textDecoration: 'none' }}>{doc.title}</Link>
                )}
                {doc.folder_name && <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>📁 {doc.folder_name}</div>}
              </div>
              <div style={{ fontSize: 11, color: '#5a6472' }}>
                {isFile ? (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f5f2ee', color: '#5a6472', border: '0.5px solid #e0ddd8' }}>
                    📎 {doc.file_size ? `${(doc.file_size/1024/1024).toFixed(1)}MB` : 'File'}
                  </span>
                ) : activeLevel === 5 && doc.template_title ? (
                  <span style={{ fontSize: 11, color: '#8a96a2' }}>{doc.template_title}</span>
                ) : (
                  <span style={{ fontFamily: 'monospace' }}>v{doc.version_major}.{doc.version_minor}</span>
                )}
              </div>
              <div>
                {!isFile && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: ss.bg, color: ss.color, border: `0.5px solid ${ss.border}`, fontWeight: 500 }}>
                    {ss.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#5a6472' }}>{doc.created_by_name || '—'}</div>
              <div style={{ fontSize: 11, color: '#5a6472' }}>
                {doc.approved_by_name || '—'}
                {doc.approved_at && <div style={{ fontSize: 10, color: '#9b9991' }}>{new Date(doc.approved_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>}
              </div>
              <div style={{ fontSize: 11, color: '#8a96a2' }}>
                {new Date(doc.updated_at || doc.created_at || '').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
