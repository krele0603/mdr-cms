#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixed = 0

# Fix 1: Add VariableNode to extensions
old1 = 'StarterKit, TextStyle, FontFamily, Underline, CommentMark,'
new1 = 'StarterKit, TextStyle, FontFamily, Underline, CommentMark, VariableNode,'
if old1 in content and 'VariableNode,' not in content:
    content = content.replace(old1, new1)
    fixed += 1
    print('Fixed: VariableNode added to extensions')
elif 'VariableNode,' in content:
    print('VariableNode already in extensions')
else:
    print('WARNING: Could not find extensions line')

# Fix 2: Add VARIABLE_STYLES to buildEditorStyles
old2 = '    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n  `'
new2 = '    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }\n    ${VARIABLE_STYLES}\n  `'
if old2 in content and '${VARIABLE_STYLES}' not in content:
    content = content.replace(old2, new2)
    fixed += 1
    print('Fixed: VARIABLE_STYLES added to editor styles')
elif '${VARIABLE_STYLES}' in content:
    print('VARIABLE_STYLES already in editor styles')
else:
    print('WARNING: Could not find column-resize-handle line')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixed} fixes applied.')
