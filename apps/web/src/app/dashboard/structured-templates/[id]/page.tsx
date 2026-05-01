'use client'
import { useState, useEffect, useRef } from 'react'
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

export default function StructuredTemplateEditor() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [template, setTemplate] = useState<any>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [editorReady, setEditorReady] = useState(false)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Write the purpose, scope and references text here. Use $$variable_name for project variables…' }),
    ],
    content: {},
    editable: true,
    onUpdate: ({ editor }) => {
      setSaveState('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(editor.getJSON(), questions), 2000)
    },
  })

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!editor || !template || !editorReady) return
    const content = template.text_content && template.text_content.type === 'doc'
      ? template.text_content
      : { type: 'doc', content: [{ type: 'paragraph' }] }
    editor.commands.setContent(content)
  }, [editor, template, editorReady])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/structured-templates/${id}`)
    if (!res.ok) { router.push('/dashboard/templates'); return }
    const data = await res.json()
    setTemplate(data.template)
    setQuestions(data.questions.map((q: any) => q.question_text))
    setLoading(false)
    setEditorReady(true)
  }

  async function save(text_content?: any, qs?: string[]) {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/structured-templates/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_content: text_content || (editor ? editor.getJSON() : undefined),
          questions: qs || questions,
        }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  async function saveName(name: string) {
    await fetch(`/api/structured-templates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setTemplate((t: any) => ({ ...t, name }))
  }

  async function saveStatus(status: string) {
    await fetch(`/api/structured-templates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTemplate((t: any) => ({ ...t, status }))
  }

  function updateQuestion(i: number, val: string) {
    const updated = [...questions]
    updated[i] = val
    setQuestions(updated)
    setSaveState('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(undefined, updated), 2000)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  if (!template) return null

  const reqTypeLabel = template.req_type === 'system' ? 'System Requirements' : 'Software Requirements'
  const reqTypeBg = template.req_type === 'system' ? '#E6F1FB' : '#EEEDFE'
  const reqTypeColor = template.req_type === 'system' ? '#0C447C' : '#3C3489'
  const reqTypeBorder = template.req_type === 'system' ? '#85B7EB' : '#AFA9EC'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#9b9991', display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Link href="/dashboard/templates" style={{ color: '#9b9991', textDecoration: 'none' }}>Templates</Link>
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500 }}>{template.name}</span>
        </div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: reqTypeBg, color: reqTypeColor, border: `0.5px solid ${reqTypeBorder}`, fontWeight: 500, flexShrink: 0 }}>
          {reqTypeLabel}
        </span>
        <div style={{ fontSize: 11, color: saveState === 'saved' ? '#9b9991' : saveState === 'saving' ? '#c8a96e' : saveState === 'error' ? '#943030' : '#c8a96e', flexShrink: 0 }}>
          {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save error' : 'Unsaved'}
        </div>
        <select value={template.status} onChange={e => saveStatus(e.target.value)}
          style={{ height: 28, padding: '0 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Toolbar */}
      {editor && (
        <div style={{ background: '#faf9f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' as const, flexShrink: 0 }}>
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1">H1</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">H2</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3">H3</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">P</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</ToolbarBtn>
          <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">⊞ Table</ToolbarBtn>
          <Divider />
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</ToolbarBtn>
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</ToolbarBtn>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 0', background: '#f5f4f0' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Template name */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '0.5px solid rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 11, color: '#9b9991', marginBottom: 6, fontWeight: 500 }}>TEMPLATE NAME</div>
            <input defaultValue={template.name}
              onBlur={e => { if (e.target.value.trim() !== template.name) saveName(e.target.value.trim()) }}
              style={{ width: '100%', fontSize: 16, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: '#1a1a18' }} />
          </div>

          {/* Block 1: Text editor */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#185FA5', background: '#E6F1FB', border: '0.5px solid #85B7EB', padding: '1px 8px', borderRadius: 4 }}>Block 1</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Purpose · Scope · References</span>
              <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>Editable text — use $$variable_name for project variables</span>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <style>{`
                .tiptap { outline: none; font-size: 14px; line-height: 1.7; color: #1a1f24; }
                .tiptap h1 { font-size: 20px; font-weight: 600; margin: 24px 0 10px; }
                .tiptap h2 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; }
                .tiptap h3 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; }
                .tiptap p { margin: 0 0 10px; }
                .tiptap ul, .tiptap ol { padding-left: 22px; margin: 0 0 10px; }
                .tiptap table { border-collapse: collapse; width: 100%; margin: 12px 0; }
                .tiptap td, .tiptap th { border: 1px solid #d0cdc8; padding: 7px 10px; font-size: 13px; }
                .tiptap th { background: #f5f4f0; font-weight: 600; }
                .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #bbb; pointer-events: none; float: left; height: 0; }
              `}</style>
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Block 2: Project description — auto */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#27500A', background: '#EAF3DE', border: '0.5px solid #97C459', padding: '1px 8px', borderRadius: 4 }}>Block 2</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Project Description</span>
              <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>Auto-filled from project variables</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['$$device_name', '$$manufacturer_name', '$$intended_use', '$$device_description', '$$classification'].map(v => (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#185FA5', background: '#E6F1FB', padding: '2px 8px', borderRadius: 4, border: '0.5px solid #85B7EB', flexShrink: 0 }}>{v}</span>
                  <span style={{ fontSize: 12, color: '#9b9991' }}>→ filled from project data at generation time</span>
                </div>
              ))}
            </div>
          </div>

          {/* Block 3: Requirements table — auto */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#633806', background: '#FAEEDA', border: '0.5px solid #FAC775', padding: '1px 8px', borderRadius: 4 }}>Block 3</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Requirements Table</span>
              <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>Auto-filled — {reqTypeLabel}</span>
            </div>
            <div style={{ padding: '16px 20px', color: '#9b9991', fontSize: 12 }}>
              The full {reqTypeLabel} table from the project will be inserted here at export time.
            </div>
          </div>

          {/* Block 4: Risk reference — auto */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5F5E5A', background: '#F1EFE8', border: '0.5px solid #D3D1C7', padding: '1px 8px', borderRadius: 4 }}>Block 4</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Risk Management Reference</span>
              <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>Auto-filled — latest approved FMEA</span>
            </div>
            <div style={{ padding: '16px 20px', color: '#9b9991', fontSize: 12 }}>
              Reference to latest approved Risk Analysis document will be auto-inserted at export time.
            </div>
          </div>

          {/* Pre-export verification questions */}
          <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Pre-export Verification Questions</span>
              <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>Shown as checkboxes before export — all must be confirmed</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>
                Software requirements: (Y/N) — edit questions below if the standard changes
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#9b9991', flexShrink: 0, marginTop: 8, fontWeight: 500 }}>{String.fromCharCode(97 + i)})</span>
                  <input value={q} onChange={e => updateQuestion(i, e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, outline: 'none', background: '#fafaf8' }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
