#!/usr/bin/env python3
"""
Fix: <main> has overflow:auto which blocks drag events crossing
its boundary. Change to overflow:visible and move scroll to an
inner wrapper so page scrolling still works.

Run from repo root:
  python3 hotfix_main_overflow.py
"""
import sys

F = 'apps/web/src/app/dashboard/layout.tsx'
with open(F) as f: s = f.read()

OLD = "      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', background: 'transparent', minWidth: 0 }}>\n        {children}\n      </main>"

NEW = "      <main style={{ flex: 1, overflow: 'visible', background: 'transparent', minWidth: 0, display: 'flex', flexDirection: 'column' }}>\n        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>\n          {children}\n        </div>\n      </main>"

if OLD not in s:
    # Try original padding value
    OLD2 = "      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>\n        {children}\n      </main>"
    if OLD2 in s:
        NEW2 = "      <main style={{ flex: 1, overflow: 'visible', background: 'transparent', minWidth: 0, display: 'flex', flexDirection: 'column' }}>\n        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>\n          {children}\n        </div>\n      </main>"
        s = s.replace(OLD2, NEW2, 1)
        print('PATCH applied (original padding variant)')
    else:
        print('ERROR: target not found in either variant')
        print('Current main line:')
        for i, line in enumerate(s.split('\n')):
            if 'main' in line and 'overflow' in line:
                print(f'  {i+1}: {line}')
        sys.exit(1)
else:
    s = s.replace(OLD, NEW, 1)
    print('PATCH applied')

with open(F, 'w') as f: f.write(s)
print('OK: main overflow fixed')
