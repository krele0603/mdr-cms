'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

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
  archived: { bg: '#f5f5f5', color: '#999',    border: '#ddd',    label: 'Archived' },
}

function ToolbarBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      style={{ height: 28, minWidth: 28, padding: '0 6px', border: 'none', borderRadius: 5, cursor: 'pointer', background: active ? 'rgba(24,95,165,0.12)' : 'transparent', color: active ? '#185FA5' : '#3a3a38', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      {children}
    </button>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />
}

export default function EqmsDocumentEditor() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const docId = params.docId as string

  const [doc, setDoc] = useState<any>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [sessionRole, setSessionRole] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [showChangeNote, setShowChangeNote] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: {},
    editable: false,
    onUpdate: ({ editor }) => {
      setSaveState('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveContent(editor.getJSON()), 2000)
    },
  })

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    loadDoc()
  }, [docId])

  async function loadDoc() {
    setLoading(true)
    const [docRes, companyRes] = await Promise.all([
      fetch(`/api/eqms/documents/${docId}`),
      fetch(`/api/companies/${companyId}`),
    ])
    if (!docRes.ok) { router.back(); return }
    const data = await docRes.json()
    const companyData = await companyRes.json()
    setDoc(data.doc)
    setVersions(data.versions)
    setCompany(companyData.company)
    setLoading(false)
    setEditorReady(true)
    return data.doc
  }

  useEffect(() => {
    if (!editor || !doc || !editorReady) return
    const content = doc.content && doc.content.type === 'doc'
      ? doc.content : { type: 'doc', content: [] }
    editor.commands.setContent(content)
    const canEdit = ['admin', 'consultant', 'client', 'client-MR'].includes(sessionRole)
      && doc.version_status === 'draft'
    editor.setEditable(canEdit)
  }, [editor, doc, sessionRole, editorReady])

  async function saveContent(content: any) {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/eqms/documents/${docId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  async function submitForApproval() {
    setSubmitting(true)
    const res = await fetch(`/api/eqms/documents/${docId}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change_note: changeNote }),
    })
    if (res.ok) { setShowChangeNote(false); setChangeNote(''); loadDoc() }
    setSubmitting(false)
  }

  async function approve() {
    if (!confirm('Approve this document? The current active version will be archived.')) return
    setSubmitting(true)
    const res = await fetch(`/api/eqms/documents/${docId}/approve`, { method: 'POST' })
    if (res.ok) loadDoc()
    setSubmitting(false)
  }

  const meta = doc ? LEVEL_META[doc.level] : null
  const status = doc ? (DOC_STATUS[doc.status] || DOC_STATUS.draft) : null
  const versionLabel = doc ? `v${doc.version_major}.${doc.version_minor}` : ''
  const isApproved = doc?.version_status === 'active'
  const canApprove = sessionRole === 'client-MR' || sessionRole === 'admin'
  const hasPendingApproval = doc?.version_status === 'pending'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  if (!doc) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#9b9991', display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Link href="/dashboard/companies" style={{ color: '#9b9991', textDecoration: 'none' }}>Companies</Link>
          <span>›</span>
          <Link href={`/dashboard/companies/${companyId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{company?.name || '…'}</Link>
          <span>›</span>
          {meta && <Link href={`/dashboard/companies/${companyId}/eqms/${doc.level}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{meta.label}</Link>}
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {meta && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>Level {doc.level}</span>}
          {status && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: status.bg, color: status.color, border: `0.5px solid ${status.border}` }}>{status.label}</span>}
          <span style={{ fontSize: 11, color: '#9b9991' }}>{versionLabel}</span>
          {doc.code && <span style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace' }}>{doc.code}</span>}
        </div>

        <div style={{ fontSize: 11, color: saveState === 'saved' ? '#9b9991' : saveState === 'saving' ? '#c8a96e' : saveState === 'error' ? '#943030' : '#c8a96e', flexShrink: 0 }}>
          {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save error' : 'Unsaved'}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowVersions(v => !v)}
            style={{ height: 28, padding: '0 10px', fontSize: 12, background: showVersions ? 'rgba(24,95,165,0.1)' : 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', color: showVersions ? '#185FA5' : '#5a6472' }}>
            History
          </button>
          {!isApproved && !hasPendingApproval && (
            <button onClick={() => setShowChangeNote(true)}
              style={{ height: 28, padding: '0 10px', fontSize: 12, background: 'rgba(78,140,140,0.1)', border: '0.5px solid rgba(78,140,140,0.3)', borderRadius: 6, cursor: 'pointer', color: '#2e5f5f' }}>
              Submit for approval
            </button>
          )}
          {hasPendingApproval && <span style={{ fontSize: 11, color: '#c8a96e', alignSelf: 'center' }}>Pending approval</span>}
          {hasPendingApproval && canApprove && (
            <button onClick={approve} disabled={submitting}
              style={{ height: 28, padding: '0 10px', fontSize: 12, background: '#EAF3DE', border: '0.5px solid #97C459', borderRadius: 6, cursor: 'pointer', color: '#27500A', fontWeight: 500 }}>
              ✓ Approve
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {editor && !isApproved && (
        <div style={{ background: '#faf9f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' as const, flexShrink: 0 }}>
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">P</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">⫷</ToolbarBtn>
          <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center">≡</ToolbarBtn>
          <ToolbarBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">⫸</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">⊞ Table</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</ToolbarBtn>
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</ToolbarBtn>
        </div>
      )}

      {/* Editor + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 0', background: '#f5f4f0' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minHeight: 900, padding: '48px 56px' }}>
            <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 6 }}>{doc.title}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9b9991' }}>
                {doc.code && <span style={{ fontFamily: 'monospace' }}>{doc.code}</span>}
                <span>{versionLabel}</span>
                {meta && <span style={{ color: meta.color }}>{meta.label}</span>}
                {doc.approved_at && <span>Approved {new Date(doc.approved_at).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
            <style>{`
              .tiptap { outline: none; font-size: 14px; line-height: 1.7; color: #1a1f24; }
              .tiptap h1 { font-size: 22px; font-weight: 600; margin: 28px 0 12px; }
              .tiptap h2 { font-size: 17px; font-weight: 600; margin: 22px 0 10px; }
              .tiptap h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; }
              .tiptap p { margin: 0 0 10px; }
              .tiptap ul, .tiptap ol { padding-left: 22px; margin: 0 0 10px; }
              .tiptap li { margin-bottom: 4px; }
              .tiptap table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              .tiptap td, .tiptap th { border: 1px solid #d0cdc8; padding: 8px 12px; font-size: 13px; }
              .tiptap th { background: #f5f4f0; font-weight: 600; }
              .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #bbb; pointer-events: none; float: left; height: 0; }
            `}</style>
            <EditorContent editor={editor} />
          </div>
        </div>

        {showVersions && (
          <div style={{ width: 280, borderLeft: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 13, fontWeight: 500 }}>Version history</div>
            {versions.map(v => (
              <div key={v.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>v{v.version_major}.{v.version_minor}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3,
                    background: v.status === 'active' ? '#EAF3DE' : v.status === 'archived' ? '#f5f5f5' : '#F1EFE8',
                    color: v.status === 'active' ? '#27500A' : v.status === 'archived' ? '#999' : '#5F5E5A',
                    border: `0.5px solid ${v.status === 'active' ? '#97C459' : v.status === 'archived' ? '#ddd' : '#D3D1C7'}` }}>
                    {v.status}
                  </span>
                </div>
                {v.change_note && <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>{v.change_note}</div>}
                <div style={{ fontSize: 10, color: '#9b9991' }}>
                  {v.created_by_name} · {new Date(v.created_at).toLocaleDateString('en-GB')}
                </div>
                {v.approved_by_name && <div style={{ fontSize: 10, color: '#9b9991', marginTop: 2 }}>Approved by {v.approved_by_name}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change note modal */}
      {showChangeNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setShowChangeNote(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Submit for approval</div>
              <button onClick={() => setShowChangeNote(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 6 }}>Change note (optional)</label>
              <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)}
                placeholder="Describe what changed in this version…" rows={4} autoFocus
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowChangeNote(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={submitForApproval} disabled={submitting}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
