#!/usr/bin/env python3
"""
Hotfix: remove doc?.approved_at reference that doesn't exist on DocData type.

Run from repo root:
  python3 patches/hotfix_approved_at.py
"""

import sys

TARGET = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

OLD = '''          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}
            {doc?.approved_at ? ` · ${new Date(doc.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </span>'''

NEW = '''          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}
          </span>'''

with open(TARGET, 'r') as f:
    src = f.read()

if OLD not in src:
    print(f'ERROR: target block not found in {TARGET}')
    sys.exit(1)

if src.count(OLD) > 1:
    print(f'ERROR: target block found more than once — refusing to patch')
    sys.exit(1)

with open(TARGET, 'w') as f:
    f.write(src.replace(OLD, NEW, 1))

print(f'OK: hotfix applied to {TARGET}')
