#!/usr/bin/env python3
"""
Hotfix: adds isDragOver state + onDragOver/onDragLeave/onDrop handlers
to the FolderNode component row div.

Run from repo root:
  python3 hotfix_foldernode_dragover.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

# 1 — add isDragOver state after renameVal state
OLD1 = "  const [renameVal, setRenameVal] = useState(folder.name)\n  const inputRef = useRef<HTMLInputElement>(null)"
NEW1 = "  const [renameVal, setRenameVal] = useState(folder.name)\n  const [isDragOver, setIsDragOver] = useState(false)\n  const inputRef = useRef<HTMLInputElement>(null)"

if OLD1 not in s:
    errors.append('1 (isDragOver state): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (isDragOver state): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: isDragOver state')

# 2 — add drag handlers + highlight to the folder row div
OLD2 = "      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}\n        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', background: isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent', marginBottom: 1 }}>"
NEW2 = "      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}\n        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}\n        onDragLeave={e => { e.stopPropagation(); setIsDragOver(false) }}\n        onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop?.(folder.id) }}\n        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', marginBottom: 1,\n          background: isDragOver ? 'rgba(78,140,140,0.18)' : isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent',\n          outline: isDragOver ? '1.5px dashed rgba(78,140,140,0.6)' : 'none',\n          transition: 'background 120ms',\n        }}>"

if OLD2 not in s:
    errors.append('2 (folder row drag handlers): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (folder row drag handlers): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: drag handlers + drop highlight on folder row')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: FolderNode drag-over handlers applied')
