#!/usr/bin/env python3
"""
Fix: replace React synthetic drag events on FolderNode with native
addEventListener via useRef+useEffect. React batches/cancels synthetic
dragover in ways that break e.preventDefault() in some Next.js configs.

Run from repo root:
  python3 hotfix_foldernode_native_dnd.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

# 1 — add a rowRef to FolderNode, next to inputRef
OLD1 = "  const inputRef = useRef<HTMLInputElement>(null)\n  const isRoot = folder.parent_id === null"
NEW1 = "  const inputRef = useRef<HTMLInputElement>(null)\n  const rowRef = useRef<HTMLDivElement>(null)\n  const isRoot = folder.parent_id === null"

if OLD1 not in s:
    errors.append('1 (rowRef): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (rowRef): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: rowRef added')

# 2 — add useEffect after the existing useEffect for renaming
OLD2 = "  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])\n\n  function commitRename() {"
NEW2 = """  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  useEffect(() => {
    const el = rowRef.current
    if (!el || !onDrop) return
    const onDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragOver(true) }
    const onDragOver  = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const onDragLeave = (e: DragEvent) => { e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragOver(false) }
    const onDropNative = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragOver(false); onDrop(folder.id) }
    el.addEventListener('dragenter', onDragEnter)
    el.addEventListener('dragover',  onDragOver)
    el.addEventListener('dragleave', onDragLeave)
    el.addEventListener('drop',      onDropNative)
    return () => {
      el.removeEventListener('dragenter', onDragEnter)
      el.removeEventListener('dragover',  onDragOver)
      el.removeEventListener('dragleave', onDragLeave)
      el.removeEventListener('drop',      onDropNative)
    }
  }, [onDrop, folder.id])

  function commitRename() {"""

if OLD2 not in s:
    errors.append('2 (native DnD useEffect): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (native DnD useEffect): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: native DnD useEffect')

# 3 — attach rowRef to the folder row div, remove React synthetic drag handlers
OLD3 = """      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        onDragEnter={e => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragOver(true) }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
        onDragLeave={e => { e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragOver(false) }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragOver(false); onDrop?.(folder.id) }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', marginBottom: 1,
          background: isDragOver ? 'rgba(78,140,140,0.18)' : isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent',
          outline: isDragOver ? '1.5px dashed rgba(78,140,140,0.6)' : 'none',
          transition: 'background 120ms',
        }}>"""

NEW3 = """      <div ref={rowRef} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', marginBottom: 1,
          background: isDragOver ? 'rgba(78,140,140,0.18)' : isSelected ? 'rgba(24,95,165,0.1)' : hovering ? 'rgba(0,0,0,0.03)' : 'transparent',
          outline: isDragOver ? '1.5px dashed rgba(78,140,140,0.6)' : 'none',
          transition: 'background 120ms',
        }}>"""

if OLD3 not in s:
    errors.append('3 (remove synthetic drag handlers, add rowRef): not found')
elif s.count(OLD3) > 1:
    errors.append('3 (remove synthetic drag handlers, add rowRef): found more than once')
else:
    s = s.replace(OLD3, NEW3, 1)
    print('3 applied: rowRef attached, synthetic handlers removed')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: native DnD applied to FolderNode')
