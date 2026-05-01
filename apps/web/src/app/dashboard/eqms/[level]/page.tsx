'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const LEVEL_META: Record<number, { label: string; color: string; bg: string; border: string; description: string }> = {
  1: { label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC', description: 'Top-level quality policies' },
  2: { label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB', description: 'How policies are implemented' },
  3: { label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459', description: 'Step-by-step operational documents' },
  4: { label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775', description: 'Documents to be filled in' },
  5: { label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7', description: 'Completed forms with real data' },
}

interface Folder { id: string; level: number; parent_id: string | null; name: string; position: number }

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
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', background: isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent', marginBottom: 1 }}>
        {/* Expand toggle */}
        <div onClick={() => folder.children.length > 0 && setExpanded(e => !e)}
          style={{ width: 14, flexShrink: 0, color: '#9b9991', fontSize: 10 }}>
          {folder.children.length > 0 ? (expanded ? '▾' : '▸') : ''}
        </div>
        {/* Folder icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#185FA5' : '#9b9991'} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        {/* Name */}
        {renaming ? (
          <input ref={inputRef} value={renameVal} onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenameVal(folder.name); setRenaming(false) } }}
            style={{ flex: 1, fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, padding: '1px 5px', outline: 'none' }}
          />
        ) : (
          <div onClick={() => onSelect(folder.id)} style={{ flex: 1, fontSize: 12, fontWeight: isRoot ? 500 : 400, color: isSelected ? '#185FA5' : '#1a1a18', userSelect: 'none' as const }}>
            {folder.name}
          </div>
        )}
        {/* Actions */}
        {canEdit && hovering && !renaming && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onAddChild(folder.id) }}
              title="New subfolder"
              style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>+</button>
            {!isRoot && <>
              <button onClick={e => { e.stopPropagation(); setRenaming(true) }}
                title="Rename"
                style={{ width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer', color: '#9b9991', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>✎</button>
              <button onClick={e => { e.stopPropagation(); onDelete(folder.id) }}
                title="Delete"
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

export default function EqmsLevelPage() {
  const params = useParams()
  const level = Number(params.level)
  const meta = LEVEL_META[level]

  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionRole, setSessionRole] = useState('')
  const [addingFolder, setAddingFolder] = useState<string | null>(null) // parentId being added to
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)

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

  async function loadFolders() {
    setLoading(true)
    const res = await fetch(`/api/eqms/folders?level=${level}`)
    if (res.ok) {
      const data = await res.json()
      setFolders(data)
      // Auto-select root folder
      const root = data.find((f: Folder) => f.parent_id === null)
      if (root && !selectedFolder) setSelectedFolder(root.id)
    }
    setLoading(false)
  }

  async function createFolder(parentId: string, name: string) {
    const res = await fetch('/api/eqms/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, parent_id: parentId, name }),
    })
    if (res.ok) { await loadFolders() }
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
    if (newFolderName.trim() && addingFolder !== null) {
      await createFolder(addingFolder, newFolderName.trim())
    }
    setAddingFolder(null)
    setNewFolderName('')
  }

  if (!meta) return <div style={{ padding: 40, color: '#9b9991' }}>Invalid level.</div>

  const tree = buildTree(folders)
  const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || ''

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>
            Level {level}
          </span>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{meta.label}</h1>
        </div>
        <div style={{ fontSize: 13, color: '#6b6a64' }}>{meta.description}</div>
      </div>

      {/* Main layout */}
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
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#9b9991' }}>Loading…</div>
            ) : tree.map(folder => (
              <FolderNode key={folder.id} folder={folder} depth={0} selected={selectedFolder}
                onSelect={setSelectedFolder} onRename={renameFolder} onDelete={deleteFolder}
                onAddChild={handleAddChild} canEdit={canEdit} />
            ))}
            {/* Inline new folder input */}
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

        {/* Document area — placeholder for next step */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedFolderName || '—'}</div>
              <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>Select a folder to view documents</div>
            </div>
            {canEdit && selectedFolder && (
              <button style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                + New document
              </button>
            )}
          </div>
          <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
            {selectedFolder ? 'Documents will appear here.' : 'Select a folder from the left.'}
          </div>
        </div>
      </div>
    </div>
  )
}
