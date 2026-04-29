'use client'
import { useState, useEffect, useRef } from 'react'

interface ProjectFile {
  id: string
  annex: string
  original_name: string
  stored_name: string
  file_size: number
  mime_type: string
  uploaded_by_name: string
  created_at: string
}

interface Storage {
  storage_limit_mb: number
  storage_used_bytes: number
}

const FILE_ICONS: Record<string, string> = {
  'pdf': '📄',
  'doc': '📝', 'docx': '📝',
  'xls': '📊', 'xlsx': '📊',
  'zip': '🗜️', 'rar': '🗜️',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || '📎'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function FilePanel({
  projectId, annex, sessionRole
}: {
  projectId: string; annex: string; sessionRole: string
}) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [storage, setStorage] = useState<Storage | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [storageFull, setStorageFull] = useState(false)
  const [increasing, setIncreasing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/files?annex=${encodeURIComponent(annex)}`)
    if (res.ok) {
      const data = await res.json()
      setFiles(data.files || [])
      setStorage(data.storage || null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId, annex])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setStorageFull(false)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('annex', annex)

    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      setUploadError(data.error || 'Upload failed')
      if (data.storage_full) setStorageFull(true)
    } else {
      await load()
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"?`)) return
    const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  async function increaseStorage() {
    setIncreasing(true)
    const res = await fetch(`/api/projects/${projectId}/storage`, { method: 'PATCH' })
    if (res.ok) { const s = await res.json(); setStorage(s); setStorageFull(false) }
    setIncreasing(false)
  }

  const usedBytes = Number(storage?.storage_used_bytes) || 0
  const limitMb = storage?.storage_limit_mb || 150
  const limitBytes = limitMb * 1024 * 1024
  const usedPct = Math.min(100, Math.round((usedBytes / limitBytes) * 100))
  const isAdmin = sessionRole === 'admin'

  return (
    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf8' }}>
      {/* Header */}
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#6b6a64' }}>📎 Files</span>
          {files.length > 0 && (
            <span style={{ fontSize: 10, color: '#9b9991' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Storage bar */}
          {storage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 60, height: 3, background: '#e0ddd8', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${usedPct}%`, height: '100%', background: usedPct > 90 ? '#C0392B' : usedPct > 70 ? '#E8A020' : '#3B6D11', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 9, color: '#9b9991' }}>{formatSize(usedBytes)}/{limitMb}MB</span>
              {isAdmin && (
                <button onClick={increaseStorage} disabled={increasing} title="Add 50MB to project storage"
                  style={{ height: 18, padding: '0 6px', fontSize: 9, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 3, color: '#185FA5', cursor: 'pointer' }}>
                  +50MB
                </button>
              )}
            </div>
          )}
          {/* Upload button */}
          <label style={{ height: 24, padding: '0 10px', fontSize: 11, background: uploading ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 5, color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {uploading ? 'Uploading…' : '+ Upload'}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Error */}
      {uploadError && (
        <div style={{ margin: '0 14px 8px', padding: '8px 12px', background: '#FDECEA', border: '0.5px solid #EB8585', borderRadius: 6, fontSize: 12, color: '#7C1C0C', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span>{uploadError}</span>
          <button onClick={() => { setUploadError(null); setStorageFull(false) }} style={{ background: 'none', border: 'none', color: '#7C1C0C', cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Storage full admin action */}
      {storageFull && isAdmin && (
        <div style={{ margin: '0 14px 8px', padding: '8px 12px', background: '#FEF0E0', border: '0.5px solid #F5B97A', borderRadius: 6, fontSize: 12, color: '#7A3B00', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Project storage is full.</span>
          <button onClick={increaseStorage} disabled={increasing}
            style={{ height: 24, padding: '0 10px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer' }}>
            {increasing ? 'Adding…' : 'Add 50MB'}
          </button>
        </div>
      )}

      {/* File list */}
      {!loading && files.length > 0 && (
        <div style={{ padding: '0 14px 10px' }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{fileIcon(f.original_name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={`/api/projects/${projectId}/files/${f.id}`} download={f.original_name}
                  style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {f.original_name}
                </a>
                <div style={{ fontSize: 10, color: '#9b9991', marginTop: 1 }}>
                  {formatSize(f.file_size)} · {f.uploaded_by_name} · {new Date(f.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </div>
              </div>
              {(isAdmin || sessionRole === 'consultant') && (
                <button onClick={() => handleDelete(f.id, f.original_name)}
                  style={{ background: 'none', border: 'none', color: '#F09595', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && files.length === 0 && (
        <div style={{ padding: '6px 14px 10px', fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>No files uploaded yet.</div>
      )}
    </div>
  )
}
