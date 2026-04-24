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
import CharacterCount from '@tiptap/extension-character-count'

interface DocData {
  id: string
  project_id: string
  annex: string
  name: string
  code: string
  content: any
  status: string
  updated_at: string
  template_version_id: string | null
  template_version: string | null
  example_content: any
  template_name: string | null
  tag_code: string | null
  project_name: string
  device_name: string
}

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:      { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  inprogress: { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'In progress' },
  review:     { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'In review' },
  approved:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
}

function ToolBtn({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      style={{
        height: 28, minWidth: 28, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: active ? '0.5px solid #85B7EB' : '0.5px solid transparent',
        borderRadius: 6,
        background: active ? '#E6F1FB' : 'transparent',
        color: active ? '#0C447C' : disabled ? '#ccc' : '#3a3a36',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: 500,
      }}
    >{children}</button>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />
}

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
      padding: '6px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4',
    }}>
      <ToolBtn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
      <ToolBtn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
      <ToolBtn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolBtn>
      <Divider />
      <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolBtn>
      <ToolBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
      <ToolBtn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>▐</ToolBtn>
      <Divider />
      <ToolBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• —</ToolBtn>
      <ToolBtn title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. —</ToolBtn>
      <Divider />
      <ToolBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>≡L</ToolBtn>
      <ToolBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>≡C</ToolBtn>
      <ToolBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>≡R</ToolBtn>
      <Divider />
      <ToolBtn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>⊞ Table</ToolBtn>
      <ToolBtn title="Add column" disabled={!editor.can().addColumnAfter()} onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</ToolBtn>
      <ToolBtn title="Add row" disabled={!editor.can().addRowAfter()} onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</ToolBtn>
      <ToolBtn title="Delete table" disabled={!editor.can().deleteTable()} onClick={() => editor.chain().focus().deleteTable().run()}>✕Tbl</ToolBtn>
      <Divider />
      <ToolBtn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↩</ToolBtn>
      <ToolBtn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↪</ToolBtn>
    </div>
  )
}

function makeExtensions(placeholder: string) {
  return [
    StarterKit, Underline, Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ]
}

const EDITOR_STYLES = `
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left; color: #aaa9a3; pointer-events: none; height: 0;
  }
  .ProseMirror { font-size: 14px; line-height: 1.7; color: #1a1a18; }
  .ProseMirror h1 { font-size: 20px; font-weight: 600; margin: 20px 0 8px; }
  .ProseMirror h2 { font-size: 16px; font-weight: 600; margin: 16px 0 6px; }
  .ProseMirror h3 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; }
  .ProseMirror p  { margin: 0 0 8px; }
  .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin: 0 0 8px; }
  .ProseMirror table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  .ProseMirror th, .ProseMirror td { border: 0.5px solid #D3D1C7; padding: 6px 10px; text-align: left; font-size: 13px; }
  .ProseMirror th { background: #f1efe8; font-weight: 600; }
  .ProseMirror mark { background: #FFF3B0; border-radius: 2px; padding: 0 2px; }
  .ProseMirror .selectedCell { background: #E6F1FB; }
`

export default function DocumentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const docId = params.docId as string

  const [doc, setDoc] = useState<DocData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showReference, setShowReference] = useState(true)
  const [docStatus, setDocStatus] = useState('draft')
  const [hasExample, setHasExample] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContent = useRef<any>(null)

  // Load session role
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setUserRole(data.user.role) })
  }, [])

  // Load document
  useEffect(() => {
    fetch(`/api/projects/${projectId}/documents/${docId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: DocData) => {
        setDoc(data)
        setDocStatus(data.status)
        const ex = data.example_content
        setHasExample(!!(ex && typeof ex === 'object' && Object.keys(ex).length > 0))
        setLoading(false)
      })
      .catch(() => router.push(`/dashboard/projects/${projectId}`))
  }, [projectId, docId])

  const save = useCallback(async (content: any) => {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [projectId, docId])

  async function updateStatus(status: string) {
    setDocStatus(status)
    await fetch(`/api/projects/${projectId}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function submitForReview() {
    setSubmitting(true)
    // Save any pending content first
    if (latestContent.current) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await save(latestContent.current)
    }
    await updateStatus('review')
    setSubmitting(false)
  }

  const editor = useEditor({
    extensions: makeExtensions('Start writing this record…'),
    content: '',
    editorProps: { attributes: { style: 'outline: none; min-height: 100%; padding: 0;' } },
    onUpdate: ({ editor }) => {
      const content = editor.getJSON()
      latestContent.current = content
      setSaveState('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 2000)
    },
  })

  useEffect(() => {
    if (!editor || !doc) return
    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
    }
  }, [editor, doc])

  const refEditor = useEditor({
    extensions: makeExtensions(''),
    content: '',
    editable: false,
    editorProps: { attributes: { style: 'outline: none; min-height: 100%; padding: 0;' } },
  })

  useEffect(() => {
    if (!refEditor || !doc) return
    const ex = doc.example_content
    if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) {
      refEditor.commands.setContent(ex)
    }
  }, [refEditor, doc])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (latestContent.current) {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          save(latestContent.current)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9b9991', fontSize: 13 }}>
      Loading record…
    </div>
  )
  if (!doc) return null

  const st = DOC_STATUS[docStatus] || DOC_STATUS.draft
  const charCount = editor?.storage.characterCount?.characters() ?? 0
  const isClient = userRole === 'client'
  const isApproved = docStatus === 'approved'
  const isReview = docStatus === 'review'

  // Back link — clients go to client project page, others to admin project page
  const backHref = isClient
    ? `/dashboard/client/projects/${projectId}`
    : `/dashboard/projects/${projectId}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      <style>{EDITOR_STYLES}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 48, flexShrink: 0,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fff',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9b9991' }}>
          <Link href={isClient ? '/dashboard/client' : '/dashboard/projects'} style={{ color: '#9b9991', textDecoration: 'none' }}>
            {isClient ? 'My Projects' : 'Projects'}
          </Link>
          <span>›</span>
          <Link href={backHref} style={{ color: '#9b9991', textDecoration: 'none' }}>{doc.project_name}</Link>
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500 }}>{doc.name}</span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Save state */}
          <span style={{
            fontSize: 11,
            color: saveState === 'saved' ? '#27500A' : saveState === 'saving' ? '#633806' : saveState === 'error' ? '#7C1C0C' : '#9b9991',
          }}>
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Save failed' : '● Unsaved'}
          </span>

          {/* Status display */}
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 6,
            background: st.bg, color: st.color, border: `0.5px solid ${st.border}`,
          }}>{st.label}</span>

          {/* Admin/consultant: full status dropdown */}
          {!isClient && (
            <select value={docStatus} onChange={e => updateStatus(e.target.value)} style={{
              height: 28, padding: '0 8px', fontSize: 12,
              border: `0.5px solid ${st.border}`, borderRadius: 6,
              background: st.bg, color: st.color, cursor: 'pointer',
            }}>
              <option value="draft">Draft</option>
              <option value="inprogress">In progress</option>
              <option value="review">In review</option>
              <option value="approved">Approved</option>
            </select>
          )}

          {/* Client: Submit for review button */}
          {isClient && !isApproved && !isReview && (
            <button
              onClick={submitForReview}
              disabled={submitting}
              style={{
                height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer',
                background: '#185FA5', border: 'none', borderRadius: 6,
                color: '#fff', opacity: submitting ? 0.7 : 1,
              }}
            >{submitting ? 'Submitting…' : 'Submit for review'}</button>
          )}

          {/* Client: In review state */}
          {isClient && isReview && (
            <span style={{ fontSize: 12, color: '#0C447C' }}>⏳ Awaiting consultant review</span>
          )}

          {/* Client: Approved state */}
          {isClient && isApproved && (
            <span style={{ fontSize: 12, color: '#27500A' }}>✓ Approved</span>
          )}

          {/* Reference toggle */}
          <button onClick={() => setShowReference(v => !v)} style={{
            height: 28, padding: '0 10px', fontSize: 12, cursor: 'pointer',
            background: showReference ? '#E6F1FB' : 'transparent',
            border: showReference ? '0.5px solid #85B7EB' : '0.5px solid rgba(0,0,0,0.15)',
            borderRadius: 6, color: showReference ? '#0C447C' : '#5F5E5A',
          }}>
            {showReference ? '▐ Hide example' : '▐ Show example'}
          </button>

          <span style={{ fontSize: 11, color: '#9b9991' }}>{charCount} chars</span>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '7px 20px', flexShrink: 0,
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        background: '#f8f7f4', fontSize: 12,
      }}>
        <span style={{ fontWeight: 500, color: '#1a1a18' }}>{doc.annex}</span>
        <span style={{ color: '#9b9991' }}>·</span>
        <span style={{ fontFamily: 'monospace', color: '#5F5E5A', fontSize: 11 }}>{doc.code}</span>
        {doc.template_name && (
          <>
            <span style={{ color: '#9b9991' }}>·</span>
            <span style={{ color: '#9b9991' }}>Template: {doc.template_name} {doc.template_version}</span>
          </>
        )}
        <span style={{ color: '#9b9991' }}>·</span>
        <span style={{ color: '#9b9991' }}>{doc.device_name}</span>
      </div>

      {/* Approved banner for clients */}
      {isClient && isApproved && (
        <div style={{
          padding: '10px 20px', background: '#EAF3DE',
          borderBottom: '0.5px solid #97C459',
          fontSize: 12, color: '#27500A', flexShrink: 0,
        }}>
          ✓ This record has been approved. It is now read-only.
        </div>
      )}

      {/* Split pane */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: showReference ? '1fr 1fr' : '1fr',
      }}>
        {/* Left — record */}
        <div style={{
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRight: showReference ? '0.5px solid rgba(0,0,0,0.1)' : 'none',
        }}>
          {/* Hide toolbar if approved for clients */}
          {!(isClient && isApproved) && <Toolbar editor={editor} />}

          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
            <EditorContent editor={isClient && isApproved ? refEditor : editor} />
          </div>
        </div>

        {/* Right — example */}
        {showReference && (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafaf8' }}>
            <div style={{
              padding: '7px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              background: '#f1efe8', fontSize: 11, fontWeight: 500, color: '#5F5E5A',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>▐</span>
              <span>Example</span>
              {doc.template_name && (
                <span style={{ fontWeight: 400, color: '#9b9991' }}>— {doc.template_name}</span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
              {hasExample ? (
                <EditorContent editor={refEditor} />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 10, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, opacity: 0.3 }}>▐</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#5F5E5A' }}>No example available</div>
                  <div style={{ fontSize: 12, color: '#9b9991', maxWidth: 260, lineHeight: 1.6 }}>
                    Ask your project consultant to provide an example for this template.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
