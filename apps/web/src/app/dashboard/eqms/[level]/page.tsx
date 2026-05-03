'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

const LEVEL_META: Record<number, { label: string; color: string; bg: string; border: string; description: string }> = {
  1: { label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC', description: 'Top-level quality policies' },
  2: { label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB', description: 'How policies are implemented' },
  3: { label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459', description: 'Step-by-step operational documents' },
  4: { label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775', description: 'Documents to be filled in' },
  5: { label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7', description: 'Completed forms with real data' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:   { bg: 'rgba(200,169,110,0.12)', color: '#8a6020', label: 'Draft' },
  pending: { bg: 'rgba(24,95,165,0.1)',    color: '#0C447C', label: 'Pending' },
  active:  { bg: 'rgba(39,80,10,0.1)',     color: '#27500A', label: 'Active' },
}

interface Folder { id: string; level: number; parent_id: string | null; name: string; position: number }
interface QmsDocument {
  id: string; level: number; folder_id: string; code: string | null; title: string
  status: string; created_at: string; updated_at: string; created_by_name: string
  version_major: number; version_minor: number; version_status: string; current_version_id: string
}
interface QmsTemplate { id: string; name: string; level: number }

function buildTree(folders: Folder[], parentId: string | null = null): (Folder & { children: any[] })[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f.id) }))
}

function FolderNode({ folder, depth, selected, onSelect, onRename, onDelete, onAddChild, canEdit }: {
  folder: Folder & { children: any[] }
  depth: number; selected: string | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  canEdit: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRoot = folder.parent_id === null
  const isSelected = selected === folder.id

  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  function commitRename() {
    setRenaming(false)
    if (renameVal.trim() && renameVal !== folder.name) onRename(folder.id, renameVal.trim())
    else setRenameVal(folder.name)
  }

  return (
    <div>
      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', background: isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent', marginBottom: 1 }}>
        <div onClick={() => folder.children.length > 0 && setExpanded(e => !e)}
          style={{ width: 14, flexShrink: 0, color: '#9b9991', fontSize: 10 }}>
          {folder.children.length > 0 ? (expanded ? '▾' : '▸') : ''}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#185FA5' : '#9b9991'} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        {renaming ? (
          <input ref={inputRef} value={renameVal} onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenameVal(folder.name); setRenaming(false) } }}
            style={{ flex: 1, fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, padding: '1px 5px', outline: 'none' }} />
        ) : (
          <div onClick={() => onSelect(folder.id)} style={{ flex: 1, fontSize: 12, fontWeight: isRoot ? 500 : 400, color: isSelected ? '#185FA5' : '#1a1a18', userSelect: 'none' as const }}>
            {folder.name}
          </div>
        )}
        {canEdit && hovering && !renaming && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onAddChild(folder.id) }} title="New subfolder"
              style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>+</button>
            {!isRoot && <>
              <button onClick={e => { e.stopPropagation(); setRenaming(true) }} title="Rename"
                style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>✎</button>
              <button onClick={e => { e.stopPropagation(); onDelete(folder.id) }} title="Delete"
                style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#e57373', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>×</button>
            </>}
          </div>
        )}
      </div>
      {expanded && folder.children.map((child: any) => (
        <FolderNode key={child.id} folder={child} depth={depth + 1} selected={selected}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} onAddChild={onAddChild} canEdit={canEdit} />
      ))}
    </div>
  )
}

// ── New document modal ─────────────────────────────────────────────────────

function NewDocumentModal({ level, folderId, onClose, onCreated }: {
  level: number; folderId: string
  onClose: () => void
  onCreated: (doc: QmsDocument) => void
}) {
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<QmsTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const meta = LEVEL_META[level]

  useEffect(() => {
    fetch(`/api/qms-templates?level=${level}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTemplates(data); setLoadingTemplates(false) })
  }, [level])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      // If template selected, fetch its content first
      let content = undefined
      if (templateId) {
        const tr = await fetch(`/api/qms-templates/${templateId}`)
        if (tr.ok) {
          const td = await tr.json()
          content = td.content
        }
      }

      const res = await fetch('/api/eqms/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_id: folderId,
          level,
          title: title.trim(),
          code: code.trim() || null,
          template_content: content || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to create'); return }
      const doc = await res.json()
      onCreated(doc)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f24' }}>New document</div>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>
            Level {level} — {meta.label}
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 5 }}>Document title *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="e.g. Document Control Procedure"
            style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 5 }}>Document code</label>
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="e.g. QMS-P-001"
            style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 5 }}>
            Use template <span style={{ color: '#9b9991', fontWeight: 400 }}>(optional)</span>
          </label>
          {loadingTemplates ? (
            <div style={{ fontSize: 12, color: '#9b9991', padding: '8px 0' }}>Loading templates...</div>
          ) : templates.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9b9991', padding: '8px 10px', background: '#f8f7f4', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.1)' }}>
              No templates available for this level.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: `0.5px solid ${templateId === '' ? meta.border : 'rgba(0,0,0,0.12)'}`, background: templateId === '' ? meta.bg : '#faf9f7', cursor: 'pointer' }}>
                <input type="radio" name="template" value="" checked={templateId === ''} onChange={() => setTemplateId('')} style={{ accentColor: meta.color }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: templateId === '' ? meta.color : '#1a1f24' }}>Blank document</div>
                  <div style={{ fontSize: 11, color: '#9b9991' }}>Start with an empty document</div>
                </div>
              </label>
              {templates.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: `0.5px solid ${templateId === t.id ? meta.border : 'rgba(0,0,0,0.12)'}`, background: templateId === t.id ? meta.bg : '#faf9f7', cursor: 'pointer' }}>
                  <input type="radio" name="template" value={t.id} checked={templateId === t.id} onChange={() => setTemplateId(t.id)} style={{ accentColor: meta.color }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: templateId === t.id ? meta.color : '#1a1f24' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#9b9991' }}>Template</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12, color: '#943030', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
            Cancel
          </button>
          <button type="button" onClick={handleCreate} disabled={saving || !title.trim()}
            style={{ height: 34, padding: '0 18px', fontSize: 13, background: meta.color, border: 'none', borderRadius: 8, cursor: title.trim() ? 'pointer' : 'default', color: '#fff', fontWeight: 500, opacity: (!title.trim() || saving) ? 0.6 : 1 }}>
            {saving ? 'Creating...' : 'Create document'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EqmsLevelPage() {
  const params = useParams()
  const router = useRouter()
  const level = Number(params.level)
  const meta = LEVEL_META[level]

  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionRole, setSessionRole] = useState('')
  const [addingFolder, setAddingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<QmsDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [showNewDocModal, setShowNewDocModal] = useState(false)

  const canEdit = ['admin', 'consultant'].includes(sessionRole)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
  }, [])

  useEffect(() => {
    if (!level || !meta) return
    loadFolders()
  }, [level])

  useEffect(() => {
    if (addingFolder !== null) newFolderRef.current?.focus()
  }, [addingFolder])

  useEffect(() => {
    if (!selectedFolder) return
    loadDocuments(selectedFolder)
  }, [selectedFolder])

  async function loadFolders() {
    setLoading(true)
    const res = await fetch(`/api/eqms/folders?level=${level}`)
    if (res.ok) {
      const data = await res.json()
      setFolders(data)
      const root = data.find((f: Folder) => f.parent_id === null)
      if (root && !selectedFolder) setSelectedFolder(root.id)
    }
    setLoading(false)
  }

  async function loadDocuments(folderId: string) {
    setDocsLoading(true)
    const res = await fetch(`/api/eqms/documents?folder_id=${folderId}`)
    if (res.ok) setDocuments(await res.json())
    else setDocuments([])
    setDocsLoading(false)
  }

  async function createFolder(parentId: string, name: string) {
    const res = await fetch('/api/eqms/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, parent_id: parentId, name }),
    })
    if (res.ok) await loadFolders()
  }

  async function renameFolder(id: string, name: string) {
    await fetch(`/api/eqms/folders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder and all its subfolders? Documents inside will not be deleted.')) return
    await fetch(`/api/eqms/folders/${id}`, { method: 'DELETE' })
    if (selectedFolder === id) setSelectedFolder(null)
    await loadFolders()
  }

  function handleAddChild(parentId: string) {
    setAddingFolder(parentId)
    setNewFolderName('')
  }

  async function commitNewFolder() {
    if (newFolderName.trim() && addingFolder !== null) await createFolder(addingFolder, newFolderName.trim())
    setAddingFolder(null)
    setNewFolderName('')
  }

  if (!meta) return <div style={{ padding: 40, color: '#9b9991' }}>Invalid level.</div>

  const tree = buildTree(folders)
  const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || ''

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>
            Level {level}
          </span>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{meta.label}</h1>
        </div>
        <div style={{ fontSize: 13, color: '#6b6a64' }}>{meta.description}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
        {/* Folder tree */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>Folders</span>
            {canEdit && (
              <button onClick={() => {
                const root = folders.find(f => f.parent_id === null)
                if (root) handleAddChild(root.id)
              }} style={{ height: 22, padding: '0 8px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
                + New
              </button>
            )}
          </div>
          <div style={{ padding: '6px 4px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#9b9991' }}>Loading...</div>
            ) : tree.map(folder => (
              <FolderNode key={folder.id} folder={folder} depth={0} selected={selectedFolder}
                onSelect={id => { setSelectedFolder(id); loadDocuments(id) }}
                onRename={renameFolder} onDelete={deleteFolder} onAddChild={handleAddChild} canEdit={canEdit} />
            ))}
            {addingFolder !== null && (
              <div style={{ padding: '4px 8px 4px 32px' }}>
                <input ref={newFolderRef} value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onBlur={commitNewFolder}
                  onKeyDown={e => { if (e.key === 'Enter') commitNewFolder(); if (e.key === 'Escape') { setAddingFolder(null); setNewFolderName('') } }}
                  placeholder="Folder name..."
                  style={{ width: '100%', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, padding: '3px 6px', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            )}
          </div>
        </div>

        {/* Document area */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedFolderName || '—'}</div>
              <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>
                {selectedFolder ? `${documents.length} document${documents.length !== 1 ? 's' : ''}` : 'Select a folder to view documents'}
              </div>
            </div>
            {canEdit && selectedFolder && (
              <button onClick={() => setShowNewDocModal(true)}
                style={{ height: 30, padding: '0 14px', fontSize: 12, background: meta.color, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                + New document
              </button>
            )}
          </div>

          {/* Document list */}
          {!selectedFolder ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              Select a folder from the left.
            </div>
          ) : docsLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading...</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: '#5a6472', marginBottom: 4 }}>No documents yet</div>
              {canEdit && <div style={{ fontSize: 12, color: '#9b9991' }}>Click "+ New document" to create one.</div>}
            </div>
          ) : (
            <div>
              {documents.map((doc, idx) => {
                const st = STATUS_STYLE[doc.status] || STATUS_STYLE.draft
                return (
                  <div key={doc.id}
                    onClick={() => router.push(`/dashboard/eqms/document/${doc.id}`)}
                    style={{ padding: '12px 16px', borderBottom: idx < documents.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                        {doc.code && <div style={{ fontSize: 11, color: '#8a96a2', flexShrink: 0 }}>{doc.code}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: st.bg, color: st.color, fontWeight: 500 }}>{st.label}</span>
                        <span style={{ fontSize: 11, color: '#9b9991' }}>v{doc.version_major}.{doc.version_minor}</span>
                        <span style={{ fontSize: 11, color: '#9b9991' }}>· {doc.created_by_name}</span>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9991" strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showNewDocModal && selectedFolder && (
        <NewDocumentModal
          level={level}
          folderId={selectedFolder}
          onClose={() => setShowNewDocModal(false)}
          onCreated={(doc) => {
            setDocuments(prev => [...prev, doc])
            // Navigate to document editor
            router.push(`/dashboard/eqms/document/${doc.id}`)
          }}
        />
      )}
    </div>
  )
}
