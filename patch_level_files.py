path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Add file state after record state
old_state = "  const canEdit = ['admin', 'consultant', 'client', 'client-MR'].includes(sessionRole)"
new_state = """  // File uploads (Level 5)
  const [files, setFiles] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canEdit = ['admin', 'consultant', 'client', 'client-MR'].includes(sessionRole)"""
content = content.replace(old_state, new_state)

# 2. Add loadFiles and uploadFile functions before createDocument
old_fn = "  async function createDocument() {"
new_fn = """  async function loadFiles(folderId: string) {
    setLoadingFiles(true)
    const res = await fetch(`/api/eqms/files?folder_id=${folderId}&company_id=${companyId}`)
    if (res.ok) setFiles(await res.json())
    setLoadingFiles(false)
  }

  async function uploadFile(file: File) {
    setUploadingFile(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder_id', selectedFolder!)
    fd.append('company_id', companyId)
    const res = await fetch('/api/eqms/files', { method: 'POST', body: fd })
    if (res.ok) {
      const f = await res.json()
      setFiles(prev => [f, ...prev])
    } else {
      const d = await res.json()
      alert(d.error || 'Upload failed')
    }
    setUploadingFile(false)
  }

  async function deleteFile(fileId: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch(`/api/eqms/files/${fileId}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  async function createDocument() {"""
content = content.replace(old_fn, new_fn)

# 3. Add loadFiles call in the selectedFolder effect
old_effect = """  useEffect(() => {
    if (!selectedFolder) { setDocuments([]); setRecords([]); return }
    if (isLevel5) loadRecords(selectedFolder)
    else loadDocuments(selectedFolder)
  }, [selectedFolder, level])"""

new_effect = """  useEffect(() => {
    if (!selectedFolder) { setDocuments([]); setRecords([]); setFiles([]); return }
    if (isLevel5) { loadRecords(selectedFolder); loadFiles(selectedFolder) }
    else loadDocuments(selectedFolder)
  }, [selectedFolder, level])"""
content = content.replace(old_effect, new_effect)

# 4. Add Upload button next to Create record button
old_btn = """              isLevel5 ? (
                <button onClick={() => {
                  setShowNewRecord(true)
                  setRecordTemplateId('')
                  setLoadingRecordTemplates(true)
                  fetch(`/api/eqms/records/templates?company_id=${companyId}`)
                    .then(r => r.ok ? r.json() : [])
                    .then(data => { setRecordTemplates(data); setLoadingRecordTemplates(false) })
                }} style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#5F5E5A', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                  + Create record
                </button>"""

new_btn = """              isLevel5 ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || !selectedFolder}
                    style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 8, color: '#5F5E5A', cursor: 'pointer' }}>
                    {uploadingFile ? 'Uploading…' : '↑ Upload file'}
                  </button>
                  <button onClick={() => {
                    setShowNewRecord(true)
                    setRecordTemplateId('')
                    setLoadingRecordTemplates(true)
                    fetch(`/api/eqms/records/templates?company_id=${companyId}`)
                      .then(r => r.ok ? r.json() : [])
                      .then(data => { setRecordTemplates(data); setLoadingRecordTemplates(false) })
                  }} style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#5F5E5A', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                    + Create record
                  </button>
                </div>"""
content = content.replace(old_btn, new_btn)

# 5. Add files section below records list — insert before the record modal
old_modal = "      {/* New record modal — Level 5 */}"
new_files_section = """      {/* Standalone files — Level 5 */}
      {isLevel5 && selectedFolder && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden', marginTop: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Uploaded files</div>
            <span style={{ fontSize: 11, color: '#8a96a2' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>
          {loadingFiles ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
          ) : files.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              No files uploaded yet.{canEdit ? ' Use "↑ Upload file" to add files.' : ''}
            </div>
          ) : files.map((f, i) => {
            const ext = f.original_name.split('.').pop()?.toLowerCase() || ''
            const isPdf = ext === 'pdf'
            const isImage = ['png','jpg','jpeg'].includes(ext)
            const icon = isPdf ? '📄' : isImage ? '🖼️' : ['xls','xlsx'].includes(ext) ? '📊' : ['doc','docx'].includes(ext) ? '📝' : '📦'
            const sizeMb = (f.file_size / 1024 / 1024).toFixed(2)
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < files.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{f.original_name}</div>
                  <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>
                    {sizeMb} MB · {f.uploaded_by_name} · {new Date(f.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <a href={`/api/eqms/files/${f.id}`} target={isPdf || isImage ? '_blank' : '_self'} rel="noopener noreferrer"
                    style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#F1EFE8', border: '0.5px solid #D3D1C7', borderRadius: 6, color: '#5F5E5A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    {isPdf || isImage ? 'View' : 'Download'}
                  </a>
                  {canEdit && (
                    <button onClick={() => deleteFile(f.id, f.original_name)}
                      style={{ height: 28, padding: '0 8px', fontSize: 12, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New record modal — Level 5 */}"""
content = content.replace(old_modal, new_files_section)

# 6. Add fileInputRef to useRef imports — already imported useRef
with open(path, 'w') as f:
    f.write(content)
print("✓ level page patched with file upload UI")
