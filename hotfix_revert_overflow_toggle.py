#!/usr/bin/env python3
"""
Revert the dragStart overflow toggle — not needed now that layout
has no overflow containers blocking drag events.

Run from repo root:
  python3 hotfix_revert_overflow_toggle.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

OLD1 = """                        onDragStart={canEdit && hasDraft ? e => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', doc.id)
                          setDragDocId(doc.id)
                          setDragDocTitle(doc.title)
                          document.querySelectorAll('*').forEach((el: any) => {
                            const s = window.getComputedStyle(el).overflow
                            if (s === 'auto' || s === 'hidden' || s === 'scroll') {
                              el.dataset.prevOverflow = s
                              el.style.overflow = 'visible'
                            }
                          })
                        } : undefined}
                        onDragEnd={canEdit && hasDraft ? () => {
                          setDragDocId(null)
                          document.querySelectorAll('[data-prev-overflow]').forEach((el: any) => {
                            el.style.overflow = el.dataset.prevOverflow
                            delete el.dataset.prevOverflow
                          })
                        } : undefined}"""

NEW1 = """                        onDragStart={canEdit && hasDraft ? e => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', doc.id)
                          setDragDocId(doc.id)
                          setDragDocTitle(doc.title)
                        } : undefined}
                        onDragEnd={canEdit && hasDraft ? () => setDragDocId(null) : undefined}"""

if OLD1 not in s:
    errors.append('1 (revert doc overflow toggle): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (revert doc overflow toggle): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: doc dragStart simplified')

OLD2 = """                          onDragStart={e => {
                            setDragRecordId(rec.id)
                            e.dataTransfer.effectAllowed = 'move'
                            document.querySelectorAll('*').forEach((el: any) => {
                              const s = window.getComputedStyle(el).overflow
                              if (s === 'auto' || s === 'hidden' || s === 'scroll') {
                                el.dataset.prevOverflow = s
                                el.style.overflow = 'visible'
                              }
                            })
                          }}
                          onDragEnd={() => {
                            setDragRecordId(null)
                            document.querySelectorAll('[data-prev-overflow]').forEach((el: any) => {
                              el.style.overflow = el.dataset.prevOverflow
                              delete el.dataset.prevOverflow
                            })
                          }}"""

NEW2 = """                          onDragStart={e => { setDragRecordId(rec.id); e.dataTransfer.effectAllowed = 'move' }}
                          onDragEnd={() => setDragRecordId(null)}"""

if OLD2 not in s:
    errors.append('2 (revert record overflow toggle): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (revert record overflow toggle): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: record dragStart simplified')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: overflow toggles reverted')
