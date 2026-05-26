#!/usr/bin/env python3
"""
Fix: overflow:hidden on the folder tree and document panels blocks
drag events from crossing panel boundaries, causing the red circle.
Replace with overflow:visible — border-radius still works, just the
inner header corners need borderRadius adjustments.

Run from repo root:
  python3 hotfix_overflow_dnd.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

errors = []

# Fix folder tree panel
OLD1 = "        {/* Folder tree */}\n        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>"
NEW1 = "        {/* Folder tree */}\n        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12 }}>"

if OLD1 not in s:
    errors.append('1 (folder tree overflow): not found')
elif s.count(OLD1) > 1:
    errors.append('1 (folder tree overflow): found more than once')
else:
    s = s.replace(OLD1, NEW1, 1)
    print('1 applied: removed overflow:hidden from folder tree panel')

# Fix document/record list panel
OLD2 = "        {/* Document / Record list */}\n        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>"
NEW2 = "        {/* Document / Record list */}\n        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12 }}>"

if OLD2 not in s:
    errors.append('2 (doc list overflow): not found')
elif s.count(OLD2) > 1:
    errors.append('2 (doc list overflow): found more than once')
else:
    s = s.replace(OLD2, NEW2, 1)
    print('2 applied: removed overflow:hidden from doc list panel')

# Fix header top corners — needs borderRadius since parent no longer clips
OLD3 = "          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>\n            <span style={{ fontSize: 12, fontWeight: 500 }}>Folders</span>"
NEW3 = "          <div style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px 12px 0 0' }}>\n            <span style={{ fontSize: 12, fontWeight: 500 }}>Folders</span>"

if OLD3 not in s:
    errors.append('3 (folder header radius): not found')
elif s.count(OLD3) > 1:
    errors.append('3 (folder header radius): found more than once')
else:
    s = s.replace(OLD3, NEW3, 1)
    print('3 applied: folder header top corners rounded')

OLD4 = "          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>"
NEW4 = "          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px 12px 0 0' }}>"

if OLD4 not in s:
    errors.append('4 (doc list header radius): not found')
elif s.count(OLD4) > 1:
    errors.append('4 (doc list header radius): found more than once')
else:
    s = s.replace(OLD4, NEW4, 1)
    print('4 applied: doc list header top corners rounded')

if errors:
    print('\nERRORS — file NOT written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F, 'w') as f: f.write(s)
print('OK: overflow fixed — drag events can now cross panel boundaries')
