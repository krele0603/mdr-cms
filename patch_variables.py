#!/usr/bin/env python3
"""
Adds variable system to:
1. Document editor - loads variables, sets global map, adds Variables toolbar button
2. Project detail page - adds "Project data" button
Run: python3 patch_variables.py
"""

import re

# ── 1. Document editor ────────────────────────────────────────────────────────
DOC_FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(DOC_FILE, 'r') as f:
    doc = f.read()

# Add VariableNode import after existing imports
if 'variable-node' not in doc:
    doc = doc.replace(
        "import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'",
        "import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'\nimport { VariableNode, VARIABLE_STYLES, setProjectVariables, resolveVariablesInContent } from '@/lib/variable-node'"
    )

# Add variables state
if '[variables, setVariables]' not in doc:
    doc = doc.replace(
        "  const [members, setMembers] = useState<Member[]>([])",
        "  const [members, setMembers] = useState<Member[]>([])\n  const [variables, setVariables] = useState<any[]>([])"
    )

# Load variables alongside members
if 'api/projects/${projectId}/variables' not in doc:
    doc = doc.replace(
        "  useEffect(() => {\n    fetch(`/api/projects/${projectId}/members`).then(r => r.ok ? r.json() : []).then(setMembers)\n  }, [projectId])",
        """  useEffect(() => {
    fetch(`/api/projects/${projectId}/members`).then(r => r.ok ? r.json() : []).then(setMembers)
    fetch(`/api/projects/${projectId}/variables`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.variables) {
        setVariables(data.variables)
        setProjectVariables(data.variables)
      }
    })
  }, [projectId])"""
    )

# Add VariableNode to makeExtensions
if 'VariableNode' not in doc:
    doc = doc.replace(
        "    StarterKit, TextStyle, FontFamily, Underline, CommentMark,",
        "    StarterKit, TextStyle, FontFamily, Underline, CommentMark, VariableNode,"
    )

# Add VARIABLE_STYLES to buildEditorStyles return
if 'VARIABLE_STYLES' not in doc:
    doc = doc.replace(
        "    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n  `",
        "    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n    ${VARIABLE_STYLES}\n  `"
    )

# Add Variables button to toolbar - insert after the ToC section
VAR_BUTTON = """
      <Sep />
      {/* Variables dropdown */}
      {variables.length > 0 && (
        <div style={{ position: 'relative' }}>
          <select
            value=""
            onChange={e => {
              const tag = e.target.value
              if (!tag || !editor) return
              editor.chain().focus().insertContent({ type: 'variableNode', attrs: { tag } }).run()
              e.target.value = ''
            }}
            style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(78,140,140,0.3)', borderRadius: 5, background: 'rgba(78,140,140,0.06)', cursor: 'pointer', color: '#2e5f5f', maxWidth: 130 }}
          >
            <option value="">+ Variable</option>
            {variables.filter(v => v.value).map((v: any) => (
              <option key={v.tag} value={v.tag}>{v.name}</option>
            ))}
          </select>
        </div>
      )}"""

if '+ Variable' not in doc:
    # Insert before the last Sep + HRule pattern  
    doc = doc.replace(
        "      {showToc && (<><Overlay onClose={() => setShowToc(false)} /><TocMenu pos={tocPos} onClose={() => setShowToc(false)} showOutline={showOutline} onToggleOutline={onToggleOutline} onInsertToc={onInsertToc} /></>)}\n    </div>",
        "      {showToc && (<><Overlay onClose={() => setShowToc(false)} /><TocMenu pos={tocPos} onClose={() => setShowToc(false)} showOutline={showOutline} onToggleOutline={onToggleOutline} onInsertToc={onInsertToc} /></>)}" + VAR_BUTTON + "\n    </div>"
    )

# Pass variables to Toolbar
if 'variables={variables}' not in doc:
    doc = doc.replace(
        "<Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))} showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} />",
        "<Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))} showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} variables={variables} />"
    )

# Update Toolbar props type
if 'variables: any[]' not in doc:
    doc = doc.replace(
        "  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void\n}) {",
        "  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void\n  variables?: any[]\n}) {"
    )

# Update Toolbar destructure
if 'variables = []' not in doc:
    doc = doc.replace(
        "function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc }:",
        "function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc, variables = [] }:"
    )

with open(DOC_FILE, 'w') as f:
    f.write(doc)
print('✓ Document editor patched')

# ── 2. Project detail page ────────────────────────────────────────────────────
PROJ_FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/page.tsx'

with open(PROJ_FILE, 'r') as f:
    proj = f.read()

# Add "Project data" button near the project header
if 'Project data' not in proj:
    # Find the project header section and add button
    proj = proj.replace(
        "      {/* Project header */}",
        """      {/* Project data button */}
      <div style={{marginBottom:10,display:'flex',justifyContent:'flex-end'}}>
        <a href={`/dashboard/projects/${id}/variables`}
          style={{display:'inline-flex',alignItems:'center',gap:6,height:32,padding:'0 14px',fontSize:12,background:'rgba(78,140,140,0.08)',border:'0.5px solid rgba(78,140,140,0.3)',borderRadius:8,color:'#2e5f5f',textDecoration:'none',fontWeight:500}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          Project data
        </a>
      </div>

      {/* Project header */}"""
    )
    with open(PROJ_FILE, 'w') as f:
        f.write(proj)
    print('✓ Project detail page patched')
else:
    print('Project detail already has Project data button')
