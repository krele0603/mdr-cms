'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'

const LEVELS = [
  { level: 1, label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
  { level: 2, label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
  { level: 3, label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  { level: 4, label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775' },
]

interface Template {
  id: string
  name: string
  level: number
  status: string
  created_at: string
  updated_at: string
}

// ── Mini editor toolbar ────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick}
      style={{ height: 26, minWidth: 26, padding: '0 6px', fontSize: 12, border: active ? '1.5px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: active ? 'rgba(24,95,165,0.1)' : '#fff', color: active ? '#185FA5' : '#5a6472', cursor: 'pointer', fontWeight: active ? 600 : 400 }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 3, padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', flexWrap: 'wrap', background: '#f8f7f4' }}>
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'U')}
      <div style={{ width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 3px' }} />
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3')}
      <div style={{ width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 3px' }} />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '• List')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. List')}
      <div style={{ width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 3px' }} />
      {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), '⬅')}
      {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '↔')}
      {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), '➡')}
    </div>
  )
}

// ── Template editor modal ──────────────────────────────────────────────────

function TemplateEditorModal({ template, onClose, onSaved }: {
  template: Template & { content?: any }
  onClose: () => void
  onSaved: (t: Template) => void
}) {
  const [name, setName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Template content...' }),
    ],
    editable: true,
  })

  useEffect(() => {
    // Load full content
    fetch(`/api/qms-templates/${template.id}`)
      .then(r => r.json())
      .then(data => {
        if (editor && data.content) {
          editor.commands.setContent(data.content)
        }
        setLoading(false)
      })
  }, [template.id, editor])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    try {
      const res = await fetch(`/api/qms-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), content: editor.getJSON() }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSaved({ ...template, ...updated, name: name.trim() })
        onClose()
      }
    } finally { setSaving(false) }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const lv = LEVELS.find(l => l.level === template.level)!

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: lv.bg, color: lv.color, border: `0.5px solid ${lv.border}`, fontWeight: 500, whiteSpace: 'nowrap' }}>
            Level {template.level} — {lv.label}
          </span>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ flex: 1, fontSize: 15, fontWeight: 600, border: 'none', outline: 'none', color: '#1a1f24', background: 'transparent' }} />
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#5a6472' }}>×</button>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} />

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9b9991', padding: 40, fontSize: 13 }}>Loading...</div>
          ) : (
            <EditorContent editor={editor} style={{ minHeight: 300, fontSize: 13, lineHeight: 1.8, color: '#1a1f24', outline: 'none' }} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()}
            style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save template'}
          </button>
        </div>
      </div>
      <style>{`
        .ProseMirror { outline: none; min-height: 300px; }
        .ProseMirror h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
        .ProseMirror h2 { font-size: 16px; font-weight: 600; margin: 14px 0 6px; }
        .ProseMirror h3 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; }
        .ProseMirror p { margin: 0 0 8px; }
        .ProseMirror ul { list-style: disc; padding-left: 20px; margin: 4px 0 8px; }
        .ProseMirror ol { list-style: decimal; padding-left: 20px; margin: 4px 0 8px; }
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #e0ddd8; padding: 6px 10px; font-size: 12px; }
        .ProseMirror th { background: #f5f2ee; font-weight: 600; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #a0a8b0; float: left; height: 0; pointer-events: none; font-style: italic; }
      `}</style>
    </div>
  )
}

// ── Import DOCX modal ──────────────────────────────────────────────────────

function ImportModal({ defaultLevel, onClose, onImported }: {
  defaultLevel: number
  onClose: () => void
  onImported: (t: Template) => void
}) {
  const [level, setLevel] = useState(defaultLevel)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewEditor = useEditor({
    extensions: [StarterKit, Underline, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    editable: false,
    content: preview?.content,
  })

  useEffect(() => {
    if (previewEditor && preview?.content) {
      previewEditor.commands.setContent(preview.content)
    }
  }, [preview, previewEditor])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.docx')) { setError('Only .docx files supported'); return }
    setFile(f)
    // Auto-set name from filename
    setName(f.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' '))
    setPreview(null)
    setError('')
  }

  async function handlePreview() {
    if (!file || !name.trim()) { setError('Please select a file and enter a name'); return }
    setPreviewing(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('level', String(level))
      fd.append('name', name.trim())
      fd.append('preview', 'true')
      const res = await fetch('/api/qms-templates', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Preview failed'); return }
      const data = await res.json()
      setPreview(data)
    } catch (e: any) { setError(e.message) }
    finally { setPreviewing(false) }
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    try {
      const res = await fetch('/api/qms-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), level, content: preview.content }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Save failed'); return }
      const t = await res.json()
      onImported(t)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 780, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f24' }}>Import DOCX template</div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#5a6472' }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Step 1 — File + settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 6 }}>Template name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Document Control Procedure"
                style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 6 }}>Level</label>
              <select value={level} onChange={e => setLevel(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level}. {l.label}</option>)}
              </select>
            </div>
          </div>

          {/* File drop area */}
          <div onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${file ? '#185FA5' : '#d8d4ce'}`, borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: file ? 'rgba(24,95,165,0.03)' : '#faf9f7' }}>
            <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFileChange} />
            {file ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#185FA5' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB — click to change</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                <div style={{ fontSize: 13, color: '#5a6472' }}>Click to select a .docx file</div>
                <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>Word documents only</div>
              </div>
            )}
          </div>

          {error && <div style={{ fontSize: 12, color: '#943030', marginBottom: 12, padding: '8px 12px', background: 'rgba(148,48,48,0.06)', borderRadius: 6 }}>{error}</div>}

          {/* Preview area */}
          {preview && (
            <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f5f2ee', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24' }}>Preview — {name}</div>
                {preview.warnings?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#8a6020' }}>{preview.warnings.length} conversion warning(s)</div>
                )}
              </div>
              <div style={{ padding: '16px 20px', maxHeight: 360, overflowY: 'auto' }}>
                <EditorContent editor={previewEditor} style={{ fontSize: 13, lineHeight: 1.8, color: '#1a1f24' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onClose}
            style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!preview ? (
              <button type="button" onClick={handlePreview} disabled={!file || !name.trim() || previewing}
                style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: file && name.trim() ? 'pointer' : 'default', color: '#fff', fontWeight: 500, opacity: (!file || !name.trim() || previewing) ? 0.6 : 1 }}>
                {previewing ? 'Converting...' : 'Preview import'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setPreview(null)}
                  style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
                  Re-select file
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save template'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror h1 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
        .ProseMirror h2 { font-size: 15px; font-weight: 600; margin: 10px 0 4px; }
        .ProseMirror h3 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
        .ProseMirror p { margin: 0 0 6px; }
        .ProseMirror ul { list-style: disc; padding-left: 18px; margin: 4px 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 18px; margin: 4px 0; }
        .ProseMirror table { border-collapse: collapse; width: 100%; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #e0ddd8; padding: 5px 8px; font-size: 12px; }
        .ProseMirror th { background: #f5f2ee; font-weight: 600; }
      `}</style>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function QmsTemplatesPage() {
  const [activeLevel, setActiveLevel] = useState(1)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
  }, [])

  useEffect(() => { loadTemplates() }, [activeLevel])

  async function loadTemplates() {
    setLoading(true)
    const res = await fetch(`/api/qms-templates?level=${activeLevel}`)
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this template? It will no longer appear in the library.')) return
    setDeletingId(id)
    await fetch(`/api/qms-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  const isAdmin = userRole === 'admin'
  const isAdminOrConsultant = ['admin', 'consultant'].includes(userRole)
  const lv = LEVELS.find(l => l.level === activeLevel)!

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a96a2', marginBottom: 10 }}>
          <Link href="/dashboard" style={{ color: '#8a96a2', textDecoration: 'none' }}>Dashboard</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24' }}>QMS Template Library</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: '0 0 4px' }}>QMS Template Library</h1>
            <div style={{ fontSize: 13, color: '#8a96a2' }}>Import and manage document templates for all QMS levels</div>
          </div>
          {isAdminOrConsultant && (
            <button type="button" onClick={() => setShowImport(true)}
              style={{ height: 36, padding: '0 18px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500 }}>
              + Import DOCX
            </button>
          )}
        </div>
      </div>

      {/* Level tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {LEVELS.map(l => (
          <button key={l.level} type="button" onClick={() => setActiveLevel(l.level)}
            style={{ height: 34, padding: '0 16px', fontSize: 13, border: activeLevel === l.level ? `1.5px solid ${l.color}` : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 20, background: activeLevel === l.level ? l.bg : '#fff', color: activeLevel === l.level ? l.color : '#5a6472', cursor: 'pointer', fontWeight: activeLevel === l.level ? 600 : 400 }}>
            {l.level}. {l.label}
          </button>
        ))}
      </div>

      {/* Templates list */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: lv.bg, color: lv.color, border: `0.5px solid ${lv.border}`, fontWeight: 500 }}>
              Level {activeLevel}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>{lv.label}</span>
          </div>
          <span style={{ fontSize: 11, color: '#8a96a2' }}>{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading...</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: '#5a6472', marginBottom: 4 }}>No templates yet</div>
            <div style={{ fontSize: 12, color: '#9b9991' }}>
              {isAdminOrConsultant ? 'Click "+ Import DOCX" to add templates for this level.' : 'No templates have been added for this level yet.'}
            </div>
          </div>
        ) : (
          templates.map((t, idx) => (
            <div key={t.id} style={{ padding: '14px 18px', borderBottom: idx < templates.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: lv.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#8a96a2' }}>
                  Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {isAdminOrConsultant && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => setEditingTemplate(t)}
                    style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>
                    Edit
                  </button>
                  {isAdmin && (
                    <button type="button" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                      style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, cursor: 'pointer', color: '#943030', opacity: deletingId === t.id ? 0.5 : 1 }}>
                      Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <ImportModal
          defaultLevel={activeLevel}
          onClose={() => setShowImport(false)}
          onImported={(t) => {
            if (t.level === activeLevel) setTemplates(prev => [...prev, t])
            setShowImport(false)
          }}
        />
      )}

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={(updated) => {
            setTemplates(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
