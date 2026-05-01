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
function Divider() { return <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} /> }

export default function RequirementsDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const reqType = params.type as string // 'system' | 'software'

  const [project, setProject] = useState<any>(null)
  const [variables, setVariables] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [fmea, setFmea] = useState<any>(null)
  const [template, setTemplate] = useState<any>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showVerification, setShowVerification] = useState(false)
  const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>([])
  const [exporting, setExporting] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  // Per-project text content (overrides template)
  const [textContent, setTextContent] = useState<any>(null)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Purpose, scope and references…' }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: true,
    onUpdate: ({ editor }) => {
      setSaveState('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveTextContent(editor.getJSON()), 2000)
    },
  })

  useEffect(() => {
    loadAll()
  }, [projectId, reqType])

  useEffect(() => {
    if (!editor || !editorReady) return
    const content = textContent?.type === 'doc'
      ? textContent
      : template?.text_content?.type === 'doc'
        ? template.text_content
        : { type: 'doc', content: [{ type: 'paragraph' }] }
    editor.commands.setContent(content)
  }, [editor, editorReady, textContent, template])

  async function loadAll() {
    setLoading(true)
    try {
      const [projRes, varsRes, reqsRes, fmeaRes, templatesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/variables`),
        fetch(`/api/projects/${projectId}/requirements?type=${reqType}`),
        fetch(`/api/projects/${projectId}/fmea`),
        fetch(`/api/structured-templates?req_type=${reqType}`),
      ])

      if (projRes.ok) {
        const d = await projRes.json()
        setProject(d.project)
      }
      if (varsRes.ok) { const vd = await varsRes.json(); setVariables(Array.isArray(vd) ? vd : (vd.variables || [])) }
      if (reqsRes.ok) {
        const d = await reqsRes.json()
        setRequirements(Array.isArray(d) ? d : (d.lists || []))
      }
      if (fmeaRes.ok) {
        const d = await fmeaRes.json()
        setFmea(d.document || d || null)
      }

      if (templatesRes.ok) {
        const tempsData = await templatesRes.json()
        const temps = Array.isArray(tempsData) ? tempsData : []
        const active = temps.find((t: any) => t.status === 'active')
        if (active) {
          const tRes = await fetch(`/api/structured-templates/${active.id}`)
          if (tRes.ok) {
            const td = await tRes.json()
            setTemplate(td.template)
            setQuestions(td.questions.map((q: any) => q.question_text))
            setCheckedQuestions(new Array(td.questions.length).fill(false))
          }
        }
      }

      // Load saved text content for this project+type
      const savedRes = await fetch(`/api/projects/${projectId}/req-document?type=${reqType}`)
      if (savedRes.ok) {
        const saved = await savedRes.json()
        if (saved?.text_content) setTextContent(saved.text_content)
      }

    } finally {
      setLoading(false)
      setEditorReady(true)
    }
  }

  async function saveTextContent(content: any) {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}/req-document`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reqType, text_content: content }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch { setSaveState('error') }
  }

  function getVar(tag: string) {
    return variables.find((v: any) => v.tag === tag)?.value || ''
  }

  function resolveVariables(text: string) {
    return text.replace(/\$\$([a-z_]+)/g, (_, tag) => getVar(`$${tag}`) || `$$${tag}`)
  }

  async function handleExport() {
    if (!allChecked) return
    setExporting(true)
    try {
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      const approverName = sessionData?.user?.name || ''
      const res = await fetch(`/api/projects/${projectId}/req-document/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reqType,
          text_content: editor?.getJSON(),
          template_id: template?.id,
          approved_by_name: approverName,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reqType}-requirements-${project?.name || 'document'}.docx`
        a.click()
        URL.revokeObjectURL(url)
        setShowVerification(false)
        setCheckedQuestions(new Array(questions.length).fill(false))
      }
    } finally { setExporting(false) }
  }

  const typeLabel = reqType === 'system' ? 'System Requirements' : 'Software Requirements'
  const typeBg = reqType === 'system' ? '#EEEDFE' : '#E6F1FB'
  const typeColor = reqType === 'system' ? '#3C3489' : '#0C447C'
  const typeBorder = reqType === 'system' ? '#AFA9EC' : '#85B7EB'
  const allChecked = checkedQuestions.every(Boolean)

  // Flatten requirements for display
  const allReqs = requirements.flatMap((list: any) =>
    (list.groups || []).flatMap((g: any) =>
      (g.reqs || []).map((r: any) => ({ ...r, groupName: g.name, prefix: g.prefix }))
    )
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#9b9991', display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{project?.name || '…'}</Link>
          <span>›</span>
          <Link href={`/dashboard/projects/${projectId}/requirements`} style={{ color: '#9b9991', textDecoration: 'none' }}>Requirements</Link>
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500 }}>{typeLabel} Document</span>
        </div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: typeBg, color: typeColor, border: `0.5px solid ${typeBorder}`, fontWeight: 500, flexShrink: 0 }}>{typeLabel}</span>
        <div style={{ fontSize: 11, color: saveState === 'saved' ? '#9b9991' : saveState === 'saving' ? '#c8a96e' : saveState === 'error' ? '#943030' : '#c8a96e', flexShrink: 0 }}>
          {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save error' : 'Unsaved'}
        </div>
        <button onClick={() => setShowVerification(true)}
          style={{ height: 30, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
          Export DOCX
        </button>
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
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</ToolbarBtn>
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</ToolbarBtn>
        </div>
      )}

      {/* Document content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 0', background: '#f5f4f0' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minHeight: 900, overflow: 'hidden' }}>

          {/* Document header */}
          <div style={{ padding: '32px 48px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{typeLabel} Specification</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9b9991' }}>
              <span>{project?.name}</span>
              <span>{project?.device_name}</span>
              {fmea?.revision && <span>FMEA Rev. {fmea.revision}</span>}
            </div>
          </div>

          {/* Block 1: Text editor */}
          <div style={{ padding: '0 48px' }}>
            <div style={{ paddingTop: 24, paddingBottom: 8, fontSize: 11, fontWeight: 600, color: '#9b9991', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Purpose · Scope · References
            </div>
            <style>{`
              .tiptap { outline: none; font-size: 14px; line-height: 1.7; color: #1a1f24; }
              .tiptap h1 { font-size: 20px; font-weight: 600; margin: 20px 0 10px; }
              .tiptap h2 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
              .tiptap h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
              .tiptap p { margin: 0 0 10px; }
              .tiptap ul, .tiptap ol { padding-left: 22px; margin: 0 0 10px; }
              .tiptap table { border-collapse: collapse; width: 100%; margin: 12px 0; }
              .tiptap td, .tiptap th { border: 1px solid #d0cdc8; padding: 7px 10px; font-size: 13px; }
              .tiptap th { background: #f5f4f0; font-weight: 600; }
              .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #bbb; pointer-events: none; float: left; height: 0; }
            `}</style>
            <EditorContent editor={editor} />
          </div>

          {/* Block 2: Project description */}
          <div style={{ margin: '8px 48px', padding: '16px', background: '#f8f7f4', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9991', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Project Description</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Device', getVar('$device_name')],
                ['Manufacturer', getVar('$manufacturer_name')],
                ['Intended Use', getVar('$intended_use')],
                ['Description', getVar('$device_description')],
                ['Classification', getVar('$classification')],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#9b9991', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#1a1a18' }}>{value}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Block 3: Requirements table */}
          <div style={{ margin: '8px 48px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9991', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12, paddingTop: 8 }}>Requirements</div>
            {allReqs.length === 0 ? (
              <div style={{ color: '#9b9991', fontSize: 13, padding: '20px 0' }}>No requirements found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    {['ID', 'Group', 'Requirement'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #d0cdc8', color: '#5a6472' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allReqs.map((r: any, i: number) => (
                    <tr key={r.id} style={{ borderBottom: '0.5px solid #e8e6e0', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: '#185FA5', whiteSpace: 'nowrap' as const }}>{r.req_id}</td>
                      <td style={{ padding: '7px 10px', fontSize: 11, color: '#6b6a64', whiteSpace: 'nowrap' as const }}>{r.groupName}</td>
                      <td style={{ padding: '7px 10px', lineHeight: 1.5 }}>{r.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Block 4: Risk reference */}
          <div style={{ margin: '8px 48px 32px', padding: '16px', background: '#fef9f0', borderRadius: 8, border: '0.5px solid #FAC775' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#633806', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>Risk Management Reference</div>
            {fmea ? (
              <div style={{ fontSize: 13, color: '#1a1a18' }}>
                {fmea.title || 'Risk Analysis'}{fmea.record_id ? ` — ${fmea.record_id}` : ''}, Revision {fmea.revision || '1.0'}, {fmea.doc_date ? new Date(fmea.doc_date).toLocaleDateString('en-GB') : ''}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#9b9991', fontStyle: 'italic' }}>No FMEA document found for this project.</div>
            )}
          </div>

        </div>
      </div>

      {/* Verification modal */}
      {showVerification && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setShowVerification(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Pre-export verification</div>
                <div style={{ fontSize: 12, color: '#9b9991', marginTop: 2 }}>All items must be confirmed before export</div>
              </div>
              <button onClick={() => setShowVerification(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a6472', marginBottom: 14 }}>Software requirements: (Y/N)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {questions.map((q, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={checkedQuestions[i] || false}
                      onChange={e => {
                        const updated = [...checkedQuestions]
                        updated[i] = e.target.checked
                        setCheckedQuestions(updated)
                      }}
                      style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                    <div>
                      <span style={{ fontSize: 12, color: '#9b9991', marginRight: 6 }}>{String.fromCharCode(97 + i)})</span>
                      <span style={{ fontSize: 13, color: checkedQuestions[i] ? '#1a1a18' : '#5a6472' }}>{q}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: allChecked ? '#27500A' : '#9b9991' }}>
                {allChecked ? '✓ All items confirmed' : `${checkedQuestions.filter(Boolean).length} / ${questions.length} confirmed`}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowVerification(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
                <button onClick={handleExport} disabled={!allChecked || exporting}
                  style={{ height: 32, padding: '0 14px', fontSize: 13, background: allChecked ? '#185FA5' : '#ccc', border: 'none', borderRadius: 8, color: '#fff', cursor: allChecked ? 'pointer' : 'not-allowed' }}>
                  {exporting ? 'Exporting…' : 'Export DOCX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
