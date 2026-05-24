#!/usr/bin/env python3
"""
Fix: STED approval bypass + PATCH route guard.

Two changes:
  1. doc page — status dropdown for STED removes 'approved' option; 
     updateStatus() intercepts STED+approved and opens the modal instead
  2. api/projects/[id]/documents/[docId]/route.ts — PATCH blocks setting
     status='approved' on a STED document (must use approve-sted endpoint)

Run from repo root:
  python3 patches/fix_sted_bypass.py
"""

import sys

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — doc page: intercept updateStatus for STED + fix dropdown
# ══════════════════════════════════════════════════════════════════════════════
F1 = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(F1) as f: s1 = f.read()

# 1A — intercept updateStatus to block STED being set to 'approved' via dropdown
OLD1A = """  async function updateStatus(status: string) {
    setDocStatus(status)
    await fetch(`/api/projects/${projectId}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }"""

NEW1A = """  async function updateStatus(status: string) {
    // STED must go through the TF approval modal — never set approved directly
    if (status === 'approved' && doc?.annex === 'STED') {
      setShowStedApprove(true)
      return
    }
    setDocStatus(status)
    await fetch(`/api/projects/${projectId}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }"""

if OLD1A not in s1:
    errors.append('FILE1A (updateStatus intercept): target not found')
elif s1.count(OLD1A) > 1:
    errors.append('FILE1A (updateStatus intercept): found more than once')
else:
    s1 = s1.replace(OLD1A, NEW1A, 1)
    print('FILE1A PATCH applied: updateStatus intercepts STED approved')

# 1B — remove 'approved' option from dropdown for STED docs
OLD1B = """              <option value=\"draft\">Draft</option><option value=\"inprogress\">In progress</option><option value=\"review\">In review</option><option value=\"approved\">Approved</option>"""

NEW1B = """              <option value=\"draft\">Draft</option><option value=\"inprogress\">In progress</option><option value=\"review\">In review</option>{doc?.annex !== 'STED' && <option value=\"approved\">Approved</option>}"""

if OLD1B not in s1:
    errors.append('FILE1B (dropdown remove approved for STED): target not found')
elif s1.count(OLD1B) > 1:
    errors.append('FILE1B (dropdown remove approved for STED): found more than once')
else:
    s1 = s1.replace(OLD1B, NEW1B, 1)
    print('FILE1B PATCH applied: removed approved option from STED dropdown')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — PATCH route: block status='approved' for STED at API level
# ══════════════════════════════════════════════════════════════════════════════
F2 = 'apps/web/src/app/api/projects/[id]/documents/[docId]/route.ts'
with open(F2) as f: s2 = f.read()

OLD2 = """  const body = await req.json()

  const setClauses: string[] = ['updated_at = NOW()']
  const vals: any[] = []
  let i = 1"""

NEW2 = """  const body = await req.json()

  // STED approval must go through /approve-sted — never allow direct status patch to 'approved'
  if (body.status === 'approved') {
    const doc = await queryOne(
      `SELECT annex FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
      [params.docId, params.id]
    )
    if (doc?.annex === 'STED') {
      return NextResponse.json(
        { error: 'STED approval requires using the Approve TF flow (POST /approve-sted)' },
        { status: 400 }
      )
    }
  }

  const setClauses: string[] = ['updated_at = NOW()']
  const vals: any[] = []
  let i = 1"""

if OLD2 not in s2:
    errors.append('FILE2 (PATCH block STED approved): target not found')
elif s2.count(OLD2) > 1:
    errors.append('FILE2 (PATCH block STED approved): found more than once')
else:
    s2 = s2.replace(OLD2, NEW2, 1)
    print('FILE2 PATCH applied: PATCH route blocks STED status=approved')

# ══════════════════════════════════════════════════════════════════════════════
# Write
# ══════════════════════════════════════════════════════════════════════════════
if errors:
    print('\nERRORS — no files written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(F1, 'w') as f: f.write(s1)
print(f'Wrote {F1}')
with open(F2, 'w') as f: f.write(s2)
print(f'Wrote {F2}')
print('\nOK: all patches applied')
