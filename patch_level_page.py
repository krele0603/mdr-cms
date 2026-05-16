path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Add Record interface after Document interface
old_interface = """interface Document {
  id: string; title: string; code: string | null; status: string
  version_major: number; version_minor: number; version_status: string
  created_by_name: string; updated_at: string; current_version_id: string
  _active_version?: { id: string; version_major: number; version_minor: number }
}"""

new_interface = """interface Document {
  id: string; title: string; code: string | null; status: string
  version_major: number; version_minor: number; version_status: string
  created_by_name: string; updated_at: string; current_version_id: string
  _active_version?: { id: string; version_major: number; version_minor: number }
}
interface Record {
  id: string; title: string; code: string | null; status: string
  version_major: number; version_minor: number; version_status: string
  created_by_name: string; updated_at: string; current_version_id: string
  template_title: string | null; template_code: string | null
}
interface RecordTemplate { id: string; title: string; code: string | null; version_major: number; version_minor: number }"""

content = content.replace(old_interface, new_interface)

# 2. Add records state after documents state
old_state = """  const [loadingFolders, setLoadingFolders] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [sessionRole, setSessionRole] = useState('')"""

new_state = """  const [loadingFolders, setLoadingFolders] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [sessionRole, setSessionRole] = useState('')
  const [records, setRecords] = useState<Record[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  // New record modal (Level 5)
  const [showNewRecord, setShowNewRecord] = useState(false)
  const [newRecordTitle, setNewRecordTitle] = useState('')
  const [newRecordCode, setNewRecordCode] = useState('')
  const [recordTemplateId, setRecordTemplateId] = useState('')
  const [recordTemplates, setRecordTemplates] = useState<RecordTemplate[]>([])
  const [loadingRecordTemplates, setLoadingRecordTemplates] = useState(false)
  const [savingRecord, setSavingRecord] = useState(false)"""

content = content.replace(old_state, new_state)

# 3. Add loadRecords call in selectedFolder effect
old_effect = """  useEffect(() => {
    if (selectedFolder) loadDocuments(selectedFolder)
    else setDocuments([])
  }, [selectedFolder])"""

new_effect = """  useEffect(() => {
    if (selectedFolder) {
      if (level === 5) loadRecords(selectedFolder)
      else loadDocuments(selectedFolder)
    } else {
      setDocuments([])
      setRecords([])
    }
  }, [selectedFolder, level])"""

content = content.replace(old_effect, new_effect)

# 4. Add loadRecords and createRecord functions before createDocument
old_fn = """  async function createDocument() {"""

new_fn = """  async function loadRecords(folderId: string) {
    setLoadingRecords(true)
    const res = await fetch(`/api/eqms/records?folder_id=${folderId}&company_id=${companyId}`)
    if (res.ok) setRecords(await res.json())
    setLoadingRecords(false)
  }

  async function createRecord() {
    if (!newRecordTitle.trim() || !selectedFolder || !recordTemplateId) return
    setSavingRecord(true)
    const res = await fetch('/api/eqms/records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: selectedFolder,
        template_id: recordTemplateId,
        title: newRecordTitle.trim(),
        code: newRecordCode.trim() || null,
        company_id: companyId,
      }),
    })
    if (res.ok) {
      const rec = await res.json()
      setShowNewRecord(false)
      setNewRecordTitle('')
      setNewRecordCode('')
      setRecordTemplateId('')
      router.push(`/dashboard/companies/${companyId}/documents/${rec.id}?type=record`)
    }
    setSavingRecord(false)
  }

  async function createDocument() {"""

content = content.replace(old_fn, new_fn)

# 5. Change "+ New document" button to "+ Create record" for level 5
old_btn = """              <button onClick={() => {
                  setShowNewDoc(true)
                  setTemplateId('')
                  setLoadingTemplates(true)
                  fetch(`/api/qms-templates?level=${level}`)
                    .then(r => r.ok ? r.json() : [])
                    .then(data => { setTemplates(data); setLoadingTemplates(false) })
                }}
                style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                + New document
              </button>"""

new_btn = """              {level === 5 ? (
                <button onClick={() => {
                    setShowNewRecord(true)
                    setRecordTemplateId('')
                    setLoadingRecordTemplates(true)
                    fetch(`/api/eqms/records/templates?company_id=${companyId}`)
                      .then(r => r.ok ? r.json() : [])
                      .then(data => { setRecordTemplates(data); setLoadingRecordTemplates(false) })
                  }}
                  style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#5F5E5A', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                  + Create record
                </button>
              ) : (
                <button onClick={() => {
                    setShowNewDoc(true)
                    setTemplateId('')
                    setLoadingTemplates(true)
                    fetch(`/api/qms-templates?level=${level}`)
                      .then(r => r.ok ? r.json() : [])
                      .then(data => { setTemplates(data); setLoadingTemplates(false) })
                  }}
                  style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                  + New document
                </button>
              )}"""

content = content.replace(old_btn, new_btn)

# 6. Add records list rendering — replace the documents.length === 0 empty state with level-aware rendering
old_empty = """          ) : loadingDocs ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              No documents in this folder.{canEdit ? ' Click "+ New document" to add one.' : ''}
            </div>
          ) : documents.map((doc, i) => {"""

new_empty = """          ) : level === 5 ? (
            loadingRecords ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
            ) : records.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
                No records in this folder.{canEdit ? ' Click "+ Create record" to add one.' : ''}
              </div>
            ) : records.map((rec, i) => (
              <div key={rec.id} style={{ padding: '12px 16px', borderBottom: i < records.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: rec.version_status === 'active' ? '#3B6D11' : rec.version_status === 'pending' ? '#c8a96e' : '#9b9991' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{rec.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {rec.code && <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{rec.code}</span>}
                    {rec.template_title && <span style={{ fontSize: 10, color: '#8a96a2' }}>from {rec.template_title}</span>}
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3,
                      background: rec.version_status === 'active' ? '#EAF3DE' : rec.version_status === 'pending' ? '#FFFBCC' : '#F1EFE8',
                      color: rec.version_status === 'active' ? '#27500A' : rec.version_status === 'pending' ? '#7A6500' : '#5F5E5A',
                      border: `0.5px solid ${rec.version_status === 'active' ? '#97C459' : rec.version_status === 'pending' ? '#F5E24A' : '#D3D1C7'}` }}>
                      {rec.version_status === 'active' ? 'Active' : rec.version_status === 'pending' ? 'Pending' : 'Draft'} v{rec.version_major}.{rec.version_minor}
                    </span>
                    <span style={{ fontSize: 10, color: '#9b9991' }}>· {rec.created_by_name}</span>
                  </div>
                </div>
                <Link href={`/dashboard/companies/${companyId}/documents/${rec.id}?type=record`}
                  style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#F1EFE8', border: '0.5px solid #D3D1C7', borderRadius: 6, color: '#5F5E5A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                  Open
                </Link>
              </div>
            ))
          ) : loadingDocs ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              No documents in this folder.{canEdit ? ' Click "+ New document" to add one.' : ''}
            </div>
          ) : documents.map((doc, i) => {"""

content = content.replace(old_empty, new_empty)

# 7. Add New Record modal before closing tag — insert before {/* New document modal */}
old_modal_comment = "      {/* New document modal */}"
new_record_modal = """      {/* New record modal — Level 5 */}
      {showNewRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setShowNewRecord(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, border: '0.5px solid rgba(0,0,0,0.12)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Create record</div>
                <div style={{ fontSize: 11, color: '#9b9991', marginTop: 2 }}>in {selectedFolderName} · Records</div>
              </div>
              <button onClick={() => setShowNewRecord(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Record title *</label>
                <input value={newRecordTitle} onChange={e => setNewRecordTitle(e.target.value)} placeholder="e.g. Training Record — John Smith" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && recordTemplateId) createRecord() }}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Record code</label>
                <input value={newRecordCode} onChange={e => setNewRecordCode(e.target.value)} placeholder="e.g. REC-001"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 6 }}>Select Level 4 template *</label>
                {loadingRecordTemplates ? (
                  <div style={{ fontSize: 12, color: '#9b9991' }}>Loading templates…</div>
                ) : recordTemplates.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9b9991', padding: '10px 12px', background: '#f8f7f4', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)' }}>
                    No approved Level 4 templates found for this company.<br/>
                    <span style={{ fontSize: 11 }}>Create and approve a Forms &amp; Templates document first.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                    {recordTemplates.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${recordTemplateId === t.id ? '#D3D1C7' : 'rgba(0,0,0,0.1)'}`, background: recordTemplateId === t.id ? '#F1EFE8' : '#faf9f7', cursor: 'pointer' }}>
                        <input type="radio" name="rec_tpl" value={t.id} checked={recordTemplateId === t.id} onChange={() => setRecordTemplateId(t.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: recordTemplateId === t.id ? '#5F5E5A' : '#1a1f24' }}>{t.title}</div>
                          <div style={{ fontSize: 10, color: '#9b9991', marginTop: 1 }}>
                            {t.code && <span style={{ fontFamily: 'monospace', marginRight: 6 }}>{t.code}</span>}
                            v{t.version_major}.{t.version_minor}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewRecord(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={createRecord} disabled={savingRecord || !newRecordTitle.trim() || !recordTemplateId}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: !newRecordTitle.trim() || !recordTemplateId ? '#ccc' : '#5F5E5A', border: 'none', borderRadius: 8, color: '#fff', cursor: !newRecordTitle.trim() || !recordTemplateId ? 'not-allowed' : 'pointer' }}>
                {savingRecord ? 'Creating…' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New document modal */}"""

content = content.replace(old_modal_comment, new_record_modal)

with open(path, 'w') as f:
    f.write(content)
print("✓ level page patched for Level 5 records")
