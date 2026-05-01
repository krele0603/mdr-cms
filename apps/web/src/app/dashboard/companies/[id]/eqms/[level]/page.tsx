'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const LEVEL_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
  2: { label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
  3: { label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  4: { label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775' },
  5: { label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7' },
}

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Active' },
  archived: { bg: '#f5f5f5', color: '#999', border: '#ddd', label: 'Archived' },
}

interface Folder { id: string; level: number; parent_id: string | null; name: string; position: number; company_id: string | null }
interface Document {
  id: string; title: string; code: string | null; status: string
  version_major: number; version_minor: number; version_status: string
  created_by_name: string; updated_at: string; current_version_id: string
}

function buildTree(folders: Folder[], parentId: string | null = null): (Folder & { children: any[] })[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f.id) }))
}

function FolderNode({ folder, depth, selected, onSelect, onRename, onDelete, onAddChild, canEdit }: {
  folder: Folder & { children: any[] }; depth: number; selected: string | null
  onSelect: (id: string) => void; onRename: (id: string, name: string) => void
  onDelete: (id: string) => void; onAddChild: (parentId: string) => void; canEdit: boolean
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
              style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>+</button>
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

export default function CompanyEqmsLevelPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const level = Number(params.level)
  const meta = LEVEL_META[level]

  const [company, setCompany] = useState<any>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [sessionRole, setSessionRole] = useState('')

  // Folder add
  const [addingFolder, setAddingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)

  // New document modal
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocCode, setNewDocCode] = useState('')
  const [savingDoc, setSavingDoc] = useState(false)

  const canEdit = ['admin', 'consultant'].includes(sessionRole)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    fetch(`/api/companies/${companyId}`).then(r => r.json()).then(d => setCompany(d.company))
  }, [companyId])

  useEffect(() => {
    if (!level || !meta) return
    loadFolders()
  }, [level, companyId])

  useEffect(() => {
    if (addingFolder !== null) newFolderRef.current?.focus()
  }, [addingFolder])

  useEffect(() => {
    if (selectedFolder) loadDocuments(selectedFolder)
    else setDocuments([])
  }, [selectedFolder])

  async function loadFolders() {
    setLoadingFolders(true)
    const res = await fetch(`/api/eqms/folders?level=${level}&company_id=${companyId}`)
    if (res.ok) {
      const data = await res.json()
      setFolders(data)
      const root = data.find((f: Folder) => f.parent_id === null)
      if (root && !selectedFolder) setSelectedFolder(root.id)
    }
    setLoadingFolders(false)
  }

  async function loadDocuments(folderId: string) {
    setLoadingDocs(true)
    const res = await fetch(`/api/eqms/documents?folder_id=${folderId}`)
    if (res.ok) setDocuments(await res.json())
    setLoadingDocs(false)
  }

  async function createFolder(parentId: string, name: string) {
    await fetch('/api/eqms/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, parent_id: parentId, name, company_id: companyId }),
    })
    await loadFolders()
  }

  async function renameFolder(id: string, name: string) {
    await fetch(`/api/eqms/folders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }

  async function deleteFolder(id: string) {
    if (!confirm('Delete this folder and all its subfolders?')) return
    await fetch(`/api/eqms/folders/${id}`, { method: 'DELETE' })
    if (selectedFolder === id) setSelectedFolder(null)
    await loadFolders()
  }

  function handleAddChild(parentId: string) {
    setAddingFolder(parentId)
    setNewFolderName('')
  }

  async function commitNewFolder() {
    if (newFolderName.trim() && addingFolder !== null) {
      await createFolder(addingFolder, newFolderName.trim())
    }
    setAddingFolder(null)
    setNewFolderName('')
  }

  async function createDocument() {
    if (!newDocTitle.trim() || !selectedFolder) return
    setSavingDoc(true)
    const res = await fetch('/api/eqms/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: selectedFolder,
        level,
        title: newDocTitle.trim(),
        code: newDocCode.trim() || null,
        company_id: companyId,
      }),
    })
    if (res.ok) {
      const doc = await res.json()
      setShowNewDoc(false)
      setNewDocTitle('')
      setNewDocCode('')
      // Navigate directly to the editor
      router.push(`/dashboard/companies/${companyId}/documents/${doc.id}`)
    }
    setSavingDoc(false)
  }

  async function deleteDocument(docId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    if (selectedFolder) loadDocuments(selectedFolder)
  }

  if (!meta) return <div style={{ padding: 40, color: '#9b9991' }}>Invalid level.</div>

  const tree = buildTree(folders)
  const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || ''

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/companies" style={{ color: '#9b9991', textDecoration: 'none' }}>Companies</Link>
        <span>›</span>
        <Link href={`/dashboard/companies/${companyId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{company?.name || '…'}</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>{meta.label}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>Level {level}</span>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{meta.label}</h1>
        </div>
        {company && <div style={{ fontSize: 13, color: '#6b6a64' }}>{company.name}</div>}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>

        {/* Folder tree */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Folders</span>
            {canEdit && (
              <button onClick={() => {
                const root = folders.find(f => f.parent_id === null)
                if (root) handleAddChild(root.id)
              }} style={{ height: 22, padding: '0 8px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>+ New</button>
            )}
          </div>
          <div style={{ padding: '6px 4px' }}>
            {loadingFolders ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#9b9991' }}>Loading…</div>
            ) : tree.map(folder => (
              <FolderNode key={folder.id} folder={folder} depth={0} selected={selectedFolder}
                onSelect={setSelectedFolder} onRename={renameFolder} onDelete={deleteFolder}
                onAddChild={handleAddChild} canEdit={canEdit} />
            ))}
            {addingFolder !== null && (
              <div style={{ padding: '4px 8px 4px 32px' }}>
                <input ref={newFolderRef} value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onBlur={commitNewFolder}
                  onKeyDown={e => { if (e.key === 'Enter') commitNewFolder(); if (e.key === 'Escape') { setAddingFolder(null); setNewFolderName('') } }}
                  placeholder="Folder name…"
                  style={{ width: '100%', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, padding: '3px 6px', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            )}
          </div>
        </div>

        {/* Document list */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedFolderName || 'Select a folder'}</div>
              <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>
                {selectedFolder ? `${documents.length} document${documents.length !== 1 ? 's' : ''}` : 'No folder selected'}
              </div>
            </div>
            {canEdit && selectedFolder && (
              <button onClick={() => setShowNewDoc(true)}
                style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                + New document
              </button>
            )}
          </div>

          {!selectedFolder ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Select a folder from the left.</div>
          ) : loadingDocs ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
              No documents in this folder.{canEdit ? ' Click "+ New document" to add one.' : ''}
            </div>
          ) : documents.map((doc, i) => {
            const s = DOC_STATUS[doc.status] || DOC_STATUS.draft
            const versionLabel = `v${doc.version_major}.${doc.version_minor}`
            return (
              <div key={doc.id} style={{ padding: '12px 16px', borderBottom: i < documents.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{doc.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {doc.code && <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{doc.code}</span>}
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: s.bg, color: s.color, border: `0.5px solid ${s.border}` }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: '#9b9991' }}>{versionLabel}</span>
                    <span style={{ fontSize: 10, color: '#9b9991' }}>· {doc.created_by_name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Link href={`/dashboard/companies/${companyId}/documents/${doc.id}`}
                    style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 6, color: '#185FA5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Open
                  </Link>
                  {canEdit && (
                    <button onClick={() => deleteDocument(doc.id, doc.title)}
                      style={{ height: 28, padding: '0 8px', fontSize: 12, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* New document modal */}
      {showNewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setShowNewDoc(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, border: '0.5px solid rgba(0,0,0,0.12)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>New document</div>
                <div style={{ fontSize: 11, color: '#9b9991', marginTop: 2 }}>in {selectedFolderName} · {meta.label}</div>
              </div>
              <button onClick={() => setShowNewDoc(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document title *</label>
                <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="e.g. Quality Management Policy" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') createDocument() }}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document code</label>
                <input value={newDocCode} onChange={e => setNewDocCode(e.target.value)} placeholder="e.g. POL-001"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewDoc(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={createDocument} disabled={savingDoc || !newDocTitle.trim()}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: !newDocTitle.trim() ? '#ccc' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: !newDocTitle.trim() ? 'not-allowed' : 'pointer' }}>
                {savingDoc ? 'Creating…' : 'Create & open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
