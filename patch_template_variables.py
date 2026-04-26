#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/templates/[id]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# 1. Add VariableNode import after existing tiptap imports
if 'variable-node' not in content:
    content = content.replace(
        "import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'",
        "import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'\nimport { VariableNode, VARIABLE_STYLES } from '@/lib/variable-node'"
    )
    fixes += 1
    print('Added VariableNode import')

# 2. Add VariableNode to makeExtensions function
if 'VariableNode' not in content:
    content = content.replace(
        '    StarterKit, TextStyle, FontFamily, Underline,\n    Highlight.configure({ multicolor: false }),',
        '    StarterKit, TextStyle, FontFamily, Underline, VariableNode,\n    Highlight.configure({ multicolor: false }),'
    )
    fixes += 1
    print('Added VariableNode to makeExtensions')

# 3. Add VariableNode to inline extensions in ExampleEditor (line ~462)
# There are two StarterKit lines - fix the second one (in ExampleEditor)
old_inline = '''    StarterKit, TextStyle, FontFamily, Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: () => {} }),'''

new_inline = '''    StarterKit, TextStyle, FontFamily, Underline, VariableNode,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: () => {} }),'''

if old_inline in content:
    content = content.replace(old_inline, new_inline)
    fixes += 1
    print('Added VariableNode to ExampleEditor inline extensions')

# 4. Add VARIABLE_STYLES to buildEditorStyles
if '${VARIABLE_STYLES}' not in content and 'VARIABLE_STYLES' in content:
    content = content.replace(
        "    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n  `",
        "    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n    ${VARIABLE_STYLES}\n  `"
    )
    fixes += 1
    print('Added VARIABLE_STYLES to editor styles')

# 5. Add Variables dropdown to Toolbar - insert after the ToC section
BUILTIN_VARS = [
    ('$device_name', 'Device name'),
    ('$manufacturer_name', 'Manufacturer name'),
    ('$manufacturer_address', 'Manufacturer address'),
    ('$manufacturer_contact', 'Manufacturer contact'),
    ('$manufacturer_email', 'Manufacturer email'),
    ('$intended_use', 'Intended use'),
    ('$device_description', 'Device description'),
    ('$classification', 'Device classification'),
    ('$basic_udi', 'Basic UDI-DI'),
    ('$notified_body', 'Notified body'),
]

VAR_OPTIONS = '\n'.join([f"            <option value=\"{tag}\">{label}</option>" for tag, label in BUILTIN_VARS])

VAR_DROPDOWN = f"""
      {{/* Variables */}}
      <Sep />
      <select
        value=""
        onChange={{e => {{
          const tag = e.target.value
          if (!tag || !editor) return
          editor.chain().focus().insertContent({{ type: 'variableNode', attrs: {{ tag }} }}).run()
          e.target.value = ''
        }}}}
        style={{{{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(78,140,140,0.3)', borderRadius: 5, background: 'rgba(78,140,140,0.06)', cursor: 'pointer', color: '#2e5f5f', maxWidth: 130 }}}}
      >
        <option value="">+ Variable</option>
{VAR_OPTIONS}
      </select>"""

# Find the end of the Toolbar function's return div - insert before closing </div>
# The toolbar ends with the ToC section then </div>
if '+ Variable' not in content:
    # Find the pattern after TocMenu closing
    old_end = "      {showToc && (<><Overlay onClose={() => setShowToc(false)} /><TocMenu pos={tocPos} onClose={() => setShowToc(false)} showOutline={showOutline} onToggleOutline={onToggleOutline} onInsertToc={onInsertToc} /></>)}\n    </div>"
    new_end = "      {showToc && (<><Overlay onClose={() => setShowToc(false)} /><TocMenu pos={tocPos} onClose={() => setShowToc(false)} showOutline={showOutline} onToggleOutline={onToggleOutline} onInsertToc={onInsertToc} /></>)}" + VAR_DROPDOWN + "\n    </div>"
    if old_end in content:
        content = content.replace(old_end, new_end)
        fixes += 1
        print('Added Variables dropdown to Toolbar')
    else:
        print('WARNING: Could not find Toolbar end pattern')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixes} fixes applied.')
