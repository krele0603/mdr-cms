#!/usr/bin/env python3
"""
Upgrades document editor with:
1. Text color picker
2. Multi-color highlight palette  
3. Image insert (base64, configurable size limit)
4. Zoom level control
5. Resizable divider between document and example panels
6. + Insert menu (Image, Table, Variable, ToC, HR)
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# ── 1. Add new imports ────────────────────────────────────────────────────────
if 'extension-color' not in content:
    content = content.replace(
        "import FontFamily from '@tiptap/extension-font-family'",
        """import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'"""
    )
    fixes += 1
    print('Added Color and Image imports')

# ── 2. Add Color and Image to makeExtensions ──────────────────────────────────
if 'Color,' not in content:
    content = content.replace(
        'StarterKit, TextStyle, FontFamily, Underline, CommentMark, VariableNode,',
        'StarterKit, TextStyle, FontFamily, Underline, CommentMark, VariableNode, Color, Image.configure({ inline: false, allowBase64: true }),'
    )
    fixes += 1
    print('Added Color and Image to extensions')

# ── 3. Enable multicolor highlight ───────────────────────────────────────────
content = content.replace(
    'Highlight.configure({ multicolor: false }),',
    'Highlight.configure({ multicolor: true }),'
)
fixes += 1
print('Enabled multicolor highlight')

# ── 4. Add zoom state ─────────────────────────────────────────────────────────
if '[zoom, setZoom]' not in content:
    content = content.replace(
        "  const [sizes, setSizes] = useState(DEFAULT_SIZES)",
        """  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [zoom, setZoom] = useState(100)"""
    )
    fixes += 1
    print('Added zoom state')

# ── 5. Add divider width state ────────────────────────────────────────────────
if 'leftWidth' not in content:
    content = content.replace(
        "  const [showComments, setShowComments] = useState(false)",
        """  const [showComments, setShowComments] = useState(false)
  const [leftWidth, setLeftWidth] = useState(60) // percentage of split pane"""
    )
    fixes += 1
    print('Added leftWidth state')

# ── 6. Add HIGHLIGHT_COLORS and TEXT_COLORS constants after DEFAULT_SIZES ─────
if 'HIGHLIGHT_COLORS' not in content:
    content = content.replace(
        "const FONTS = [",
        """const HIGHLIGHT_COLORS = [
  { label: 'Yellow',      value: '#fef08a' },
  { label: 'Orange',      value: '#fed7aa' },
  { label: 'Green',       value: '#bbf7d0' },
  { label: 'Blue',        value: '#bae6fd' },
  { label: 'Pink',        value: '#fecdd3' },
  { label: 'Purple',      value: '#e9d5ff' },
  { label: 'None',        value: null },
]

const TEXT_COLORS = [
  { label: 'Default',    value: null },
  { label: 'Black',      value: '#1a1f24' },
  { label: 'Dark grey',  value: '#5a6472' },
  { label: 'Grey',       value: '#8a96a2' },
  { label: 'Teal',       value: '#2e5f5f' },
  { label: 'Blue',       value: '#1d4ed8' },
  { label: 'Red',        value: '#dc2626' },
  { label: 'Orange',     value: '#ea580c' },
  { label: 'Green',      value: '#16a34a' },
  { label: 'Purple',     value: '#7c3aed' },
]

const FONTS = ["""
    )
    fixes += 1
    print('Added color constants')

# ── 7. Add image insert function (for toolbar) ────────────────────────────────
if 'insertImage' not in content:
    content = content.replace(
        "  function insertToc() {",
        """  function insertImage(editor: any) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    const maxKB = parseInt(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_KB || '1024')
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (file.size > maxKB * 1024) {
        alert(`Image too large. Maximum size is ${maxKB}KB.`)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        editor.chain().focus().setImage({ src }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function insertToc() {"""
    )
    fixes += 1
    print('Added insertImage function')

# ── 8. Replace Toolbar with enhanced version including Insert menu ────────────
# Find the Toolbar function and replace its props type to include new props
if 'onInsertImage' not in content:
    content = content.replace(
        "  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void\n  variables?: any[]\n}) {",
        """  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void
  variables?: any[]
  onInsertImage?: () => void
  zoom: number; onZoomChange: (z: number) => void
}) {"""
    )
    content = content.replace(
        "function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc, variables = [] }:",
        "function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc, variables = [], onInsertImage, zoom, onZoomChange }:"
    )
    fixes += 1
    print('Updated Toolbar props')

# ── 9. Add color pickers and Insert menu to toolbar ───────────────────────────
# Add after the existing highlight button, before Sep
if 'TEXT_COLORS' not in content or 'colorPickerOpen' not in content:
    # Add color picker state inside Toolbar
    content = content.replace(
        "  const [showTable, setShowTable] = useState(false)\n  const [showFont, setShowFont] = useState(false)\n  const [showToc, setShowToc] = useState(false)",
        """  const [showTable, setShowTable] = useState(false)
  const [showFont, setShowFont] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlightColor, setShowHighlightColor] = useState(false)
  const [showInsert, setShowInsert] = useState(false)
  const textColorRef = useRef<HTMLDivElement>(null)
  const highlightColorRef = useRef<HTMLDivElement>(null)
  const insertRef = useRef<HTMLDivElement>(null)
  const [textColorPos, setTextColorPos] = useState({ top: 0, left: 0 })
  const [highlightColorPos, setHighlightColorPos] = useState({ top: 0, left: 0 })
  const [insertPos, setInsertPos] = useState({ top: 0, left: 0 })"""
    )
    fixes += 1
    print('Added color picker state to Toolbar')

# ── 10. Add color swatches and Insert menu JSX to toolbar ─────────────────────
# Insert before the existing Sep after Highlight button
# Find the highlight button and add color pickers after it
if 'showTextColor &&' not in content:
    old_highlight = "      <Btn title=\"Highlight\" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><I.Highlight /></Btn>"
    new_highlight = """      {/* Text color */}
      <div ref={textColorRef} style={{ position: 'relative' }}>
        <button onMouseDown={e => { e.preventDefault(); setTextColorPos(getPos(textColorRef)); setShowTextColor(v => !v); setShowHighlightColor(false); setShowInsert(false) }}
          title="Text color" style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', borderRadius: 5, background: 'transparent', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: editor.getAttributes('textStyle').color || '#1a1f24', textDecoration: 'underline', textDecorationColor: editor.getAttributes('textStyle').color || '#1a1f24' }}>A</span>
        </button>
        {showTextColor && (
          <><Overlay onClose={() => setShowTextColor(false)} />
          <div style={{ position: 'fixed', top: textColorPos.top, left: textColorPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4, width: 144 }}>
            <div style={{ width: '100%', fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 2 }}>Text color</div>
            {TEXT_COLORS.map(c => (
              <button key={c.label} title={c.label} onMouseDown={e => { e.preventDefault(); if (c.value) editor.chain().focus().setColor(c.value).run(); else editor.chain().focus().unsetColor().run(); setShowTextColor(false) }}
                style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative' }}>
                {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#5a6472' }}>✕</span>}
              </button>
            ))}
          </div></>
        )}
      </div>
      {/* Highlight color */}
      <div ref={highlightColorRef} style={{ position: 'relative' }}>
        <button onMouseDown={e => { e.preventDefault(); setHighlightColorPos(getPos(highlightColorRef)); setShowHighlightColor(v => !v); setShowTextColor(false); setShowInsert(false) }}
          title="Highlight color" style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 5, background: editor.isActive('highlight') ? 'rgba(78,140,140,0.15)' : 'transparent', cursor: 'pointer' }}>
          <I.Highlight />
        </button>
        {showHighlightColor && (
          <><Overlay onClose={() => setShowHighlightColor(false)} />
          <div style={{ position: 'fixed', top: highlightColorPos.top, left: highlightColorPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4, width: 120 }}>
            <div style={{ width: '100%', fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 2 }}>Highlight</div>
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c.label} title={c.label} onMouseDown={e => { e.preventDefault(); if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run(); else editor.chain().focus().unsetHighlight().run(); setShowHighlightColor(false) }}
                style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative' }}>
                {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#5a6472' }}>✕</span>}
              </button>
            ))}
          </div></>
        )}
      </div>"""

    content = content.replace(
        "      <Btn title=\"Highlight\" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><I.Highlight /></Btn>",
        new_highlight
    )
    fixes += 1
    print('Added text color and highlight color pickers')

# ── 11. Add + Insert menu replacing scattered Table/ToC ───────────────────────
# Add Insert button after the existing Sep before Table
if 'showInsert &&' not in content:
    # Find the table ref section and add Insert menu before it
    old_table_section = "      <div ref={tableRef}><Btn title=\"Table\" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); setShowTable(v => !v); setShowFont(false); setShowToc(false) }}><I.Table /><I.ChevDown /></Btn></div>"
    
    new_insert_section = """      <Sep />
      {/* + Insert menu */}
      <div ref={insertRef}>
        <Btn title="Insert" active={showInsert} onClick={() => { setInsertPos(getPos(insertRef)); setShowInsert(v => !v); setShowTable(false); setShowFont(false); setShowToc(false); setShowTextColor(false); setShowHighlightColor(false) }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>+ Insert</span><I.ChevDown />
        </Btn>
      </div>
      {showInsert && (
        <><Overlay onClose={() => setShowInsert(false)} />
        <div style={{ position: 'fixed', top: insertPos.top, left: insertPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 200, padding: '6px 0' }}>
          <button onMouseDown={e => { e.preventDefault(); onInsertImage?.(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
            <div><div style={{ fontWeight: 500 }}>Image</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Insert from file</div></div>
          </button>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <I.Table />
            <div><div style={{ fontWeight: 500 }}>Table</div><div style={{ fontSize: 10, color: '#8a96a2' }}>3×3 with header</div></div>
          </button>
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 5, cols: 4, withHeaderRow: true }).run(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <I.Table />
            <div><div style={{ fontWeight: 500 }}>Table (5×4)</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Larger table</div></div>
          </button>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
          {variables.filter(v => v.value).map((v: any) => (
            <button key={v.tag} onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertContent({ type: 'variableNode', attrs: { tag: v.tag } }).run(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <code style={{ fontSize: 10, color: '#4e8c8c', background: 'rgba(78,140,140,0.1)', padding: '1px 4px', borderRadius: 3 }}>{v.tag}</code>
              <span>{v.name}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
          <button onMouseDown={e => { e.preventDefault(); onInsertToc(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <I.ToC />
            <div><div style={{ fontWeight: 500 }}>Table of Contents</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Auto-generated from headings</div></div>
          </button>
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); setShowInsert(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>
            <div><div style={{ fontWeight: 500 }}>Horizontal rule</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Section divider</div></div>
          </button>
        </div></>
      )}
      <Sep />
      {/* Table controls (when cursor is in table) */}
      {editor.can().addColumnAfter() && (
        <div ref={tableRef}><Btn title="Table options" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); setShowTable(v => !v); setShowFont(false); setShowToc(false); setShowInsert(false) }}><I.Table /><I.ChevDown /></Btn></div>
      )}
      {!editor.can().addColumnAfter() && (
        <div ref={tableRef}><Btn title="Table options" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); setShowTable(v => !v); setShowFont(false); setShowToc(false); setShowInsert(false) }}><I.Table /><I.ChevDown /></Btn></div>
      )}"""

    content = content.replace(old_table_section, new_insert_section)
    fixes += 1
    print('Added Insert menu')

# ── 12. Add zoom controls to bottom of editor area ────────────────────────────
# Add zoom display in the meta strip
if 'zoom}%' not in content:
    content = content.replace(
        "          <span style={{ marginLeft: 'auto' }}>{wordCount} words</span>",
        """          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{wordCount} words</span>
            <span style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.15)' }} />
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ width: 18, height: 18, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ minWidth: 36, textAlign: 'center', fontSize: 11 }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 18, height: 18, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            <button onClick={() => setZoom(100)} style={{ height: 18, padding: '0 5px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 10, color: '#5a6472' }}>Reset</button>
          </span>"""
    )
    fixes += 1
    print('Added zoom controls to meta strip')

# ── 13. Apply zoom transform to document page card ────────────────────────────
if 'zoom / 100' not in content:
    content = content.replace(
        "              <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>",
        """              <div style={{ maxWidth: 780, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${zoom / 100})`, marginBottom: zoom < 100 ? `${-(780 * (1 - zoom/100))}px` : 0 }}>
              <div style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>"""
    )
    content = content.replace(
        "                <EditorContent editor={isClient && isApproved ? refEditor : editor} />\n              </div>",
        "                <EditorContent editor={isClient && isApproved ? refEditor : editor} />\n              </div>\n              </div>"
    )
    fixes += 1
    print('Applied zoom transform')

# ── 14. Pass new props to Toolbar ─────────────────────────────────────────────
if 'onInsertImage' not in content:
    content = content.replace(
        "<Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))} showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} variables={variables} />",
        "<Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))} showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} variables={variables} onInsertImage={() => insertImage(editor)} zoom={zoom} onZoomChange={setZoom} />"
    )
    fixes += 1
    print('Updated Toolbar props in JSX')

# ── 15. Add resizable divider between document and example panels ──────────────
if 'onMouseDown.*divider\|dragDivider\|isDragging' not in content and 'isDragging' not in content:
    # Add isDragging ref
    content = content.replace(
        "  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)",
        """  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(60)"""
    )

    # Add divider drag handlers
    content = content.replace(
        "  function insertImage(editor: any) {",
        """  function startDividerDrag(e: React.MouseEvent) {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = leftWidth
    document.addEventListener('mousemove', onDividerDrag)
    document.addEventListener('mouseup', stopDividerDrag)
  }

  function onDividerDrag(e: MouseEvent) {
    if (!isDragging.current) return
    const containerWidth = window.innerWidth - 220 // minus nav
    const dx = e.clientX - dragStartX.current
    const newPct = dragStartWidth.current + (dx / containerWidth) * 100
    setLeftWidth(Math.max(25, Math.min(75, newPct)))
  }

  function stopDividerDrag() {
    isDragging.current = false
    document.removeEventListener('mousemove', onDividerDrag)
    document.removeEventListener('mouseup', stopDividerDrag)
  }

  function insertImage(editor: any) {"""
    )
    fixes += 1
    print('Added resizable divider drag handlers')

    # Replace the split pane layout to use leftWidth
    content = content.replace(
        "        {/* Left — editable */}\n        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: showReference ? '1px solid #d8d4ce' : 'none' }}>",
        """        {/* Left — editable */}
        <div style={{ width: showReference ? `${leftWidth}%` : '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>"""
    )

    # Replace example panel to use remaining width with divider handle
    content = content.replace(
        "        {/* Right — example */}\n        {showReference && (\n          <div style={{ width: '40%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>",
        """        {/* Drag divider */}
        {showReference && (
          <div
            onMouseDown={startDividerDrag}
            onDoubleClick={() => setLeftWidth(60)}
            title="Drag to resize · Double-click to reset"
            style={{ width: 6, flexShrink: 0, background: 'transparent', cursor: 'col-resize', borderLeft: '1px solid #d8d4ce', borderRight: '1px solid #d8d4ce', position: 'relative', zIndex: 10 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,140,140,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          />
        )}
        {/* Right — example */}
        {showReference && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>"""
    )
    fixes += 1
    print('Added resizable divider to split pane')

# ── 16. Add image styles to editor CSS ───────────────────────────────────────
if '.ProseMirror img' not in content:
    content = content.replace(
        "    .column-resize-handle { background-color: #4e8c8c;",
        """    .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; cursor: pointer; }
    .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #4e8c8c; }
    .column-resize-handle { background-color: #4e8c8c;"""
    )
    fixes += 1
    print('Added image styles')

with open(FILE, 'w') as f:
    f.write(content)

print(f'\nDone. {fixes} fixes applied.')
print('Next: rebuild Docker image')
