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

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateVersion {
  id: string
  version: string
  is_current: boolean
  change_note: string | null
  created_at: string
  created_by_name: string | null
}

interface TemplateData {
  id: string
  name: string
  tag_code: string
  status: string
  created_by_name: string | null
  versions: TemplateVersion[]
  // current version content (loaded separately)
  content?: any
  example_content?: any
  version_id?: string
  version?: string
}

type Tab = 'template' | 'example'
type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  active:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7' },
  archived: { bg: '#FDECEA', color: '#7C1C0C', border: '#EB8585' },
}

// ── Shared editor pieces ───────────────────────────────────────────────────────

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
    StarterKit,
    Underline,
    Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
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

// ── Save modal ─────────────────────────────────────────────────────────────────

function SaveModal({
  onClose, onSave, currentVersion,
}: {
  onClose: () => void
  onSave: (mode: 'update' | 'new', newVersion: string, changeNote: string) => Promise<void>
  currentVersion: string
}) {
  const [mode, setMode] = useState<'update' | 'new'>('update')
  const [newVersion, setNewVersion] = useState(() => {
    // Auto-increment: v1 → v2
    const m = currentVersion?.match(/^v(\d+)$/)
    return m ? `v${parseInt(m[1]) + 1}` : `${currentVersion}-2`
  })
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (mode === 'new' && !newVersion.trim()) {
      setError('Version label is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(mode, newVersion.trim(), changeNote.trim())
      onClose()
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 34, padding: '0 10px', fontSize: 13,
    border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none',
    boxSizing: 'border-box', background: '#fafaf8',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 24, width: 440,
        border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Save template</div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['update', 'new'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, height: 36, fontSize: 13, cursor: 'pointer', borderRadius: 8,
              border: mode === m ? '0.5px solid #85B7EB' : '0.5px solid rgba(0,0,0,0.15)',
              background: mode === m ? '#E6F1FB' : '#fafaf8',
              color: mode === m ? '#0C447C' : '#5F5E5A', fontWeight: mode === m ? 500 : 400,
            }}>
              {m === 'update' ? `Update ${currentVersion}` : 'Save as new version'}
            </button>
          ))}
        </div>

        {mode === 'new' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 4, display: 'block' }}>
              New version label
            </label>
            <input
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              value={newVersion}
              onChange={e => setNewVersion(e.target.value)}
              placeholder="e.g. v2"
              autoFocus
            />
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 4, display: 'block' }}>
            Change note <span style={{ fontWeight: 400, color: '#9b9991' }}>(optional)</span>
          </label>
          <input
            style={inputStyle}
            value={changeNote}
            onChange={e => setChangeNote(e.target.value)}
            placeholder="What changed in this version?"
            autoFocus={mode === 'update'}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: '#7C1C0C', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer',
            background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, color: '#5F5E5A',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer',
            background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff',
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('template')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Hold latest content from both editors so we save both together
  const latestTemplateContent = useRef<any>(null)
  const latestExampleContent = useRef<any>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  async function load() {
    try {
      // Load template meta + versions
      const res = await fetch(`/api/templates/${templateId}`)
      if (!res.ok) throw new Error()
      const data: TemplateData = await res.json()

      // Load current version content
      const currentVer = data.versions?.find(v => v.is_current) ?? data.versions?.[0]
      if (currentVer) {
        const vRes = await fetch(`/api/templates/${templateId}/versions/${currentVer.id}`)
        if (vRes.ok) {
          const vData = await vRes.json()
          data.content = vData.content
          data.example_content = vData.example_content
          data.version_id = currentVer.id
          data.version = currentVer.version
        }
      }

      setTemplate(data)
      setLoading(false)
    } catch {
      router.push('/dashboard/templates')
    }
  }

  useEffect(() => { load() }, [templateId])

  // ── Template editor ────────────────────────────────────────────────────────
  const templateEditor = useEditor({
    extensions: makeExtensions('Write the template structure here — headings, checklists, tables…'),
    content: '',
    editorProps: { attributes: { style: 'outline: none; min-height: 100%; padding: 0;' } },
    onUpdate: ({ editor }) => {
      latestTemplateContent.current = editor.getJSON()
      setSaveState('unsaved')
    },
  })

  useEffect(() => {
    if (!templateEditor || !template?.content) return
    if (Object.keys(template.content).length > 0) {
      templateEditor.commands.setContent(template.content)
      latestTemplateContent.current = template.content
    }
  }, [templateEditor, template])

  // ── Example editor ─────────────────────────────────────────────────────────
  const exampleEditor = useEditor({
    extensions: makeExtensions('Write the ACME example here — show users how this template should be filled…'),
    content: '',
    editorProps: { attributes: { style: 'outline: none; min-height: 100%; padding: 0;' } },
    onUpdate: ({ editor }) => {
      latestExampleContent.current = editor.getJSON()
      setSaveState('unsaved')
    },
  })

  useEffect(() => {
    if (!exampleEditor || !template?.example_content) return
    if (Object.keys(template.example_content).length > 0) {
      exampleEditor.commands.setContent(template.example_content)
      latestExampleContent.current = template.example_content
    }
  }, [exampleEditor, template])

  // ── Save logic ─────────────────────────────────────────────────────────────
  async function handleSave(mode: 'update' | 'new', newVersionLabel: string, changeNote: string) {
    if (!template) return
    setSaveState('saving')

    const content = latestTemplateContent.current ?? template.content ?? {}
    const example_content = latestExampleContent.current ?? template.example_content ?? {}

    if (mode === 'update' && template.version_id) {
      // PATCH the existing version's content
      const res = await fetch(`/api/templates/${templateId}/versions/${template.version_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, example_content, change_note: changeNote }),
      })
      if (!res.ok) {
        setSaveState('error')
        throw new Error('Failed to update version')
      }
    } else {
      // POST a new version
      const res = await fetch(`/api/templates/${templateId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersionLabel,
          content,
          example_content,
          change_note: changeNote,
          set_current: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveState('error')
        throw new Error(err.error || 'Failed to create version')
      }
    }

    setSaveState('saved')
    await load()
  }

  // Ctrl/Cmd+S → open save modal
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveState === 'unsaved') setShowSaveModal(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveState])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9b9991', fontSize: 13 }}>Loading template…</div>
  }
  if (!template) return null

  const st = STATUS_STYLES[template.status] || STATUS_STYLES.draft
  const activeEditor = activeTab === 'template' ? templateEditor : exampleEditor
  const charCount = activeEditor?.storage.characterCount?.characters() ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      <style>{EDITOR_STYLES}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 48, flexShrink: 0,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fff',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9b9991' }}>
          <Link href="/dashboard/templates" style={{ color: '#9b9991', textDecoration: 'none' }}>Templates</Link>
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500 }}>{template.name}</span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11,
            color: saveState === 'saved' ? '#27500A' : saveState === 'saving' ? '#633806' : saveState === 'error' ? '#7C1C0C' : '#9b9991',
          }}>
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Save failed' : '● Unsaved changes'}
          </span>

          <button onClick={() => setShowHistory(v => !v)} style={{
            height: 28, padding: '0 10px', fontSize: 12, cursor: 'pointer',
            background: showHistory ? '#F1EFE8' : 'transparent',
            border: showHistory ? '0.5px solid #D3D1C7' : '0.5px solid rgba(0,0,0,0.15)',
            borderRadius: 6, color: '#5F5E5A',
          }}>
            ⏱ History
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            disabled={saveState === 'saved'}
            style={{
              height: 28, padding: '0 14px', fontSize: 12, cursor: saveState === 'saved' ? 'default' : 'pointer',
              background: saveState === 'saved' ? '#f1efe8' : '#185FA5',
              border: 'none', borderRadius: 6,
              color: saveState === 'saved' ? '#9b9991' : '#fff',
            }}
          >
            Save
          </button>

          <span style={{ fontSize: 11, color: '#9b9991' }}>{charCount} chars</span>
        </div>
      </div>

      {/* ── Meta strip + tabs ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        background: '#f8f7f4',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['template', 'example'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              height: 38, padding: '0 16px', fontSize: 13, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #185FA5' : '2px solid transparent',
              color: activeTab === tab ? '#185FA5' : '#5F5E5A',
              fontWeight: activeTab === tab ? 500 : 400,
            }}>
              {tab === 'template' ? 'Template' : 'Example'}
            </button>
          ))}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#9b9991' }}>
          <span style={{ fontFamily: 'monospace' }}>${template.tag_code}</span>
          <span>·</span>
          <span style={{
            padding: '2px 7px', borderRadius: 4, fontSize: 11,
            background: st.bg, color: st.color, border: `0.5px solid ${st.border}`,
          }}>{template.status}</span>
          {template.version && (
            <>
              <span>·</span>
              <span style={{ fontFamily: 'monospace' }}>{template.version}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Body: editor + optional history panel ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Editor column */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRight: showHistory ? '0.5px solid rgba(0,0,0,0.1)' : 'none',
        }}>
          <Toolbar editor={activeEditor} />

          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
            {/* Template editor */}
            <div style={{ display: activeTab === 'template' ? 'block' : 'none' }}>
              <EditorContent editor={templateEditor} />
            </div>
            {/* Example editor */}
            <div style={{ display: activeTab === 'example' ? 'block' : 'none' }}>
              <EditorContent editor={exampleEditor} />
            </div>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafaf8' }}>
            <div style={{
              padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              fontSize: 12, fontWeight: 500, color: '#5F5E5A', background: '#f1efe8',
            }}>Version history</div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {template.versions.length === 0 ? (
                <div style={{ padding: 20, fontSize: 12, color: '#9b9991', textAlign: 'center' }}>No versions yet</div>
              ) : template.versions.map(v => (
                <div key={v.id} style={{
                  padding: '10px 16px',
                  borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                  background: v.is_current ? '#E6F1FB' : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                      color: v.is_current ? '#0C447C' : '#1a1a18',
                    }}>{v.version}</span>
                    {v.is_current && (
                      <span style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 3,
                        background: '#B5D4F4', color: '#0C447C',
                      }}>current</span>
                    )}
                  </div>
                  {v.change_note && (
                    <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 3 }}>{v.change_note}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#9b9991' }}>
                    {v.created_by_name ?? 'Unknown'} · {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSaveModal && template.version && (
        <SaveModal
          currentVersion={template.version}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
