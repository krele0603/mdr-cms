#!/usr/bin/env python3
"""
Hotfix: fixes drag-and-drop red circle.

The onDragLeave fires immediately when cursor enters a child element
(icon, text) inside the folder div, cancelling preventDefault and
causing the red circle. Fix: use a dragenter counter instead.

Run from repo root:
  python3 hotfix_foldernode_dragfix.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

# 1 — replace isDragOver boolean state with a counter ref approach
OLD1 = "  const [isDragOver, setIsDragOver] = useState(false)\n  const inputRef = useRef<HTMLInputElement>(null)"
NEW1 = "  const [isDragOver, setIsDragOver] = useState(false)\n  const dragCounter = useRef(0)\n  const inputRef = useRef<HTMLInputElement>(null)"

if OLD1 not in s:
    errors.append('1 (dragCounter ref): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (dragCounter ref): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: dragCounter ref')

# 2 — fix the drag handlers to use counter
OLD2 = "        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}\n        onDragLeave={e => { e.stopPropagation(); setIsDragOver(false) }}\n        onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop?.(folder.id) }}"

NEW2 = "        onDragEnter={e => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragOver(true) }}\n        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}\n        onDragLeave={e => { e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragOver(false) }}\n        onDrop={e => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragOver(false); onDrop?.(folder.id) }}"

if OLD2 not in s:
    errors.append('2 (drag handlers counter fix): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (drag handlers counter fix): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: drag handlers use counter')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: drag-over fix applied')
