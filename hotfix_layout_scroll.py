#!/usr/bin/env python3
"""
Fix: remove overflowY:auto from the inner div in dashboard/layout.tsx.
Use natural document scroll instead. This is the only remaining
overflow container blocking drag events from reaching folder nodes.

Run from repo root:
  python3 hotfix_layout_scroll.py
"""
import sys

F = 'apps/web/src/app/dashboard/layout.tsx'
with open(F) as f: s = f.read()

OLD = """  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <DashboardNav user={user} />
      <main style={{ flex: 1, overflow: 'visible', background: 'transparent', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {children}
        </div>
      </main>
    </div>
  )"""

NEW = """  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <DashboardNav user={user} />
      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  )"""

if OLD not in s:
    print('ERROR: target not found')
    print('Current content:')
    print(s)
    sys.exit(1)

with open(F, 'w') as f: f.write(s.replace(OLD, NEW, 1))
print('OK: layout uses natural document scroll, no overflow containers')
