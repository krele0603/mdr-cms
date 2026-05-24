path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/qms-templates/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# ── Patch 1: Add TocItem type ─────────────────────────────────────────────────
old_levels = """const LEVELS = ["""
new_levels = """interface TocItem {
  id: string
  textContent: string
  level: number
  itemIndex?: string
}

const LEVELS = ["""

if old_levels in content:
    content = content.replace(old_levels, new_levels, 1)
    print('Patch 1 OK: TocItem type added')
else:
    print('ERROR Patch 1: LEVELS not found')

# ── Patch 2: Add TOC icon to I object ────────────────────────────────────────
old_last_icon = "  ChevDown:    () => <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><polyline points='6 9 12 15 18 9'/></svg>,"
new_last_icon = """  ChevDown:    () => <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><polyline points='6 9 12 15 18 9'/></svg>,
  TOC:         () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='8' y1='6' x2='21' y2='6'/><line x1='8' y1='12' x2='21' y2='12'/><line x1='8' y1='18' x2='21' y2='18'/><line x1='3' y1='6' x2='3.01' y2='6'/><line x1='3' y1='12' x2='3.01' y2='12'/><line x1='3' y1='18' x2='3.01' y2='18'/></svg>,"""

if old_last_icon in content:
    content = content.replace(old_last_icon, new_last_icon)
    print('Patch 2 OK: TOC icon added')
else:
    print('ERROR Patch 2: ChevDown icon not found')

# ── Patch 3: Add OutlinePanel component before FullToolbar ───────────────────
old_toolbar_start = "function FullToolbar({ editor, sizes, onSizeChange, onInsertImage }: {"
new_toolbar_start = """function OutlinePanel({ items, onClose }: { items: TocItem[]; onClose: () => void }) {
  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f7', borderRight: '1px solid #e0ddd8' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f2ee' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Outline</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '8px 0' }}>
        {items.length === 0
          ? <div style={{ padding: '20px 14px', fontSize: 12, color: '#8a96a2' }}>No headings yet.</div>
          : items.map(item => (
            <button key={item.id} onClick={() => { const el = document.getElementById(item.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: `5px 14px 5px ${8 + (item.level - 1) * 12}px`, fontSize: item.level === 1 ? 12 : 11, fontWeight: item.level === 1 ? 600 : item.level === 2 ? 500 : 400, color: item.level === 1 ? '#1a1f24' : item.level === 2 ? '#2e3640' : '#5a6472', border: 'none', background: 'transparent', cursor: 'pointer', lineHeight: 1.4 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,140,140,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {item.level > 1 && <span style={{ color: '#d8d4ce', marginRight: 4 }}>{'—'.repeat(item.level - 1)}</span>}
              {item.textContent}
            </button>
          ))}
      </div>
    </div>
  )
}

function FullToolbar({ editor, sizes, onSizeChange, onInsertImage }: {"""

if old_toolbar_start in content:
    content = content.replace(old_toolbar_start, new_toolbar_start)
    print('Patch 3 OK: OutlinePanel added')
else:
    print('ERROR Patch 3: FullToolbar start not found')

# ── Patch 4: Update FullToolbar signature to accept TOC props ────────────────
old_toolbar_sig = """function FullToolbar({ editor, sizes, onSizeChange, onInsertImage }: {
  editor: any
  sizes: typeof DEFAULT_SIZES
  onSizeChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  onInsertImage: () => void
})"""

new_toolbar_sig = """function FullToolbar({ editor, sizes, onSizeChange, onInsertImage, showOutline, onToggleOutline, onInsertToc }: {
  editor: any
  sizes: typeof DEFAULT_SIZES
  onSizeChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  onInsertImage: () => void
  showOutline: boolean
  onToggleOutline: () => void
  onInsertToc: () => void
})"""

if old_toolbar_sig in content:
    content = content.replace(old_toolbar_sig, new_toolbar_sig)
    print('Patch 4 OK: FullToolbar signature updated')
else:
    print('ERROR Patch 4: FullToolbar signature not found')

# ── Patch 5: Add TOC button after Image button in toolbar ────────────────────
old_img_btn = "      <Btn title=\"Insert image\" onClick={onInsertImage}><I.Image /></Btn>\n    </div>\n  )\n}"
new_img_btn = """      <Btn title="Insert image" onClick={onInsertImage}><I.Image /></Btn>
      <Sep />
      <Btn title={showOutline ? 'Hide outline' : 'Show outline'} active={showOutline} onClick={onToggleOutline}><I.TOC /></Btn>
      <Btn title="Insert Table of Contents" onClick={onInsertToc}><I.TOC /><span style={{ fontSize: 10, marginLeft: 2 }}>ToC</span></Btn>
    </div>
  )
}"""

if old_img_btn in content:
    content = content.replace(old_img_btn, new_img_btn)
    print('Patch 5 OK: TOC buttons added to toolbar')
else:
    print('ERROR Patch 5: Image button end not found')

# ── Patch 6: Update makeExtensions to accept onTocUpdate ────────────────────
old_make_ext = """function makeExtensions() {
  return [
    StarterKit,
    TextStyle,
    FontFamily,
    Underline,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
    Placeholder.configure({ placeholder: 'Template content…' }),
    TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: () => {} }),
  ]
}"""

new_make_ext = """function makeExtensions(onTocUpdate: (items: TocItem[]) => void) {
  return [
    StarterKit,
    TextStyle,
    FontFamily,
    Underline,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
    Placeholder.configure({ placeholder: 'Template content…' }),
    TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: (c: any) => onTocUpdate(c) }),
  ]
}"""

if old_make_ext in content:
    content = content.replace(old_make_ext, new_make_ext)
    print('Patch 6 OK: makeExtensions updated')
else:
    print('ERROR Patch 6: makeExtensions not found')

# ── Patch 7: Add tocItems state and insertToc function to page component ─────
old_state = """  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)

  const editor = useEditor({
    extensions: makeExtensions(),"""

new_state = """  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [showOutline, setShowOutline] = useState(false)

  function insertToc() {
    if (!editor || tocItems.length === 0) return
    const lines = tocItems.map(item => {
      const cls = item.level === 1 ? '' : item.level === 2 ? ' class="toc-h2"' : ' class="toc-h3"'
      return `<li${cls}>${item.itemIndex ? item.itemIndex + '. ' : ''}${item.textContent}</li>`
    }).join('')
    editor.chain().focus().insertContent(`<div class="toc-block"><h4>Table of Contents</h4><ol>${lines}</ol></div>`).run()
  }

  const editor = useEditor({
    extensions: makeExtensions(setTocItems),"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print('Patch 7 OK: tocItems state and insertToc added')
else:
    print('ERROR Patch 7: state block not found')

# ── Patch 8: Update FullToolbar call to pass TOC props ──────────────────────
old_toolbar_call = """      <FullToolbar
        editor={editor}
        sizes={sizes}
        onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
        onInsertImage={insertImage}
      />"""

new_toolbar_call = """      <FullToolbar
        editor={editor}
        sizes={sizes}
        onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
        onInsertImage={insertImage}
        showOutline={showOutline}
        onToggleOutline={() => setShowOutline(v => !v)}
        onInsertToc={insertToc}
      />"""

if old_toolbar_call in content:
    content = content.replace(old_toolbar_call, new_toolbar_call)
    print('Patch 8 OK: FullToolbar call updated')
else:
    print('ERROR Patch 8: FullToolbar call not found')

# ── Patch 9: Add outline panel and TOC styles to editor body ─────────────────
old_editor_body = """      {/* Editor body — full width */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 0' }}>"""

new_editor_body = """      {/* Editor body — full width */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showOutline && <OutlinePanel items={tocItems} onClose={() => setShowOutline(false)} />}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 0' }}>"""

if old_editor_body in content:
    content = content.replace(old_editor_body, new_editor_body)
    print('Patch 9 OK: outline panel added to layout')
else:
    print('ERROR Patch 9: editor body not found')

# ── Patch 10: Close the extra div and add TOC styles ─────────────────────────
old_close = """            <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>"""

new_close = """            <EditorContent editor={editor} />
            </div>
          )}
        </div>
        </div>
      </div>"""

if old_close in content:
    content = content.replace(old_close, new_close)
    print('Patch 10 OK: closing div added')
else:
    print('ERROR Patch 10: closing div not found')

# ── Patch 11: Add TOC styles to the editor CSS ───────────────────────────────
old_css_end = "              .column-resize-handle { background-color: #185FA5; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }"
new_css_end = """              .column-resize-handle { background-color: #185FA5; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
              .ProseMirror .toc-block { background: #f5f2ee; border: 1px solid #e0ddd8; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
              .ProseMirror .toc-block h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8a96a2; margin: 0 0 10px; border: none; }
              .ProseMirror .toc-block ol { margin: 0; padding-left: 18px; }
              .ProseMirror .toc-block li { font-size: 13px; margin-bottom: 4px; color: #2e3640; }
              .ProseMirror .toc-block li.toc-h2 { padding-left: 12px; font-size: 12px; color: #5a6472; }
              .ProseMirror .toc-block li.toc-h3 { padding-left: 24px; font-size: 11px; color: #8a96a2; }"""

if old_css_end in content:
    content = content.replace(old_css_end, new_css_end)
    print('Patch 11 OK: TOC styles added')
else:
    print('ERROR Patch 11: CSS end not found')

with open(path, 'w') as f:
    f.write(content)
print('Done')
