#!/usr/bin/env python3
"""
Definitive DnD fix:
- Makes the entire draft document row div draggable (not just the tiny grip icon)
- Uses a native dragstart listener via data attributes to avoid React issues
- Keeps the grip icon as visual hint only
- Adds user-select:none to prevent text selection interfering with drag

Run from repo root:
  python3 hotfix_row_draggable.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

# Make the outer draft column div draggable instead of the tiny icon
OLD1 = """                      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {hasDraft ? (
                          <>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isPending ? '#c8a96e' : '#9b9991' }} />"""

NEW1 = """                      <div
                        draggable={!!(canEdit && hasDraft)}
                        onDragStart={canEdit && hasDraft ? e => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', doc.id)
                          setDragDocId(doc.id)
                          setDragDocTitle(doc.title)
                        } : undefined}
                        onDragEnd={canEdit && hasDraft ? () => setDragDocId(null) : undefined}
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                          cursor: canEdit && hasDraft ? 'grab' : 'default',
                          userSelect: 'none',
                          opacity: dragDocId && dragDocId !== doc.id ? 0.5 : 1,
                          transition: 'opacity 150ms',
                        }}>
                        {hasDraft ? (
                          <>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isPending ? '#c8a96e' : '#9b9991' }} />"""

if OLD1 not in s:
    errors.append('1 (row draggable): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (row draggable): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: entire draft row is draggable')

# Simplify the grip icon — remove draggable from it since row is now draggable
OLD2 = """                            <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                              {canEdit && (
                                <div
                                  draggable
                                  onDragStart={e => { setDragDocId(doc.id); setDragDocTitle(doc.title); e.dataTransfer.effectAllowed = 'move' }}
                                  onDragEnd={() => setDragDocId(null)}
                                  title=\"Drag to move to another folder\"
                                  style={{ cursor: 'grab', color: '#c8c4bc', padding: '0 4px', fontSize: 14, lineHeight: 1, opacity: dragDocId === doc.id ? 0.4 : 1 }}
                                >⠿</div>
                              )}"""

NEW2 = """                            <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                              {canEdit && hasDraft && (
                                <span title="Drag to move folder" style={{ color: '#c8c4bc', fontSize: 14, lineHeight: 1, pointerEvents: 'none' }}>⠿</span>
                              )}"""

if OLD2 not in s:
    errors.append('2 (simplify grip icon): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (simplify grip icon): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: grip icon simplified, drag is on row')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: entire row drag applied')
