#!/usr/bin/env python3
"""
Patches for TF lifecycle role + obsolete/revert support.

Changes:
  1. api/projects/[id]/route.ts
       — filter superseded + obsolete from project doc list
  2. api/projects/[id]/documents/[docId]/revise/route.ts
       — add client-MR to allowed roles
  3. dashboard/projects/[id]/documents/[docId]/page.tsx
       — add 'obsolete' to DOC_STATUS
       — fix shouldBeReadOnly: client sees read-only on approved, obsolete stays editable (readable) for all
       — add isClientMR to revise button condition
       — add Revert button for admin/consultant/MR when doc is a non-first revision in draft/inprogress/review
  4. dashboard/projects/[id]/page.tsx
       — add 'obsolete' to DOC_STATUS
       — exclude obsolete from active doc counts + badge logic
       — hide superseded AND obsolete from annex doc list

Run from repo root:
  python3 patches/patch_tf_roles_revert.py
"""

import sys

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — api/projects/[id]/route.ts — filter superseded+obsolete from list
# ══════════════════════════════════════════════════════════════════════════════
F1 = 'apps/web/src/app/api/projects/[id]/route.ts'
with open(F1) as f: s1 = f.read()

OLD1 = """    SELECT pd.id, pd.annex, pd.name, pd.code, pd.status, pd.updated_at,
           pd.revision, pd.color_flag, pd.tracker_comment,
           pd.assigned_to, u.name AS assigned_name
    FROM project_documents pd
    LEFT JOIN users u ON u.id = pd.assigned_to
    WHERE pd.project_id = $1::uuid
    ORDER BY pd.annex, pd.name"""

NEW1 = """    SELECT pd.id, pd.annex, pd.name, pd.code, pd.status, pd.updated_at,
           pd.revision, pd.color_flag, pd.tracker_comment,
           pd.assigned_to, u.name AS assigned_name
    FROM project_documents pd
    LEFT JOIN users u ON u.id = pd.assigned_to
    WHERE pd.project_id = $1::uuid
      AND pd.status NOT IN ('superseded', 'obsolete')
    ORDER BY pd.annex, pd.name"""

if OLD1 not in s1:
    errors.append('FILE1 (filter superseded/obsolete): target not found')
elif s1.count(OLD1) > 1:
    errors.append('FILE1 (filter superseded/obsolete): found more than once')
else:
    s1 = s1.replace(OLD1, NEW1, 1)
    print('FILE1 PATCH applied: filter superseded+obsolete from project doc list')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — revise/route.ts — add client-MR role
# ══════════════════════════════════════════════════════════════════════════════
F2 = 'apps/web/src/app/api/projects/[id]/documents/[docId]/revise/route.ts'
with open(F2) as f: s2 = f.read()

OLD2 = "  if (!session || !['admin', 'consultant'].includes(session.role)) {"
NEW2 = "  if (!session || !['admin', 'consultant', 'client-MR'].includes(session.role)) {"

if OLD2 not in s2:
    errors.append('FILE2 (revise role): target not found')
elif s2.count(OLD2) > 1:
    errors.append('FILE2 (revise role): found more than once')
else:
    s2 = s2.replace(OLD2, NEW2, 1)
    print('FILE2 PATCH applied: added client-MR to revise route')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 3 — doc page — 4 patches
# ══════════════════════════════════════════════════════════════════════════════
F3 = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(F3) as f: s3 = f.read()

# 3A — add obsolete to DOC_STATUS
OLD3A = "  superseded: { bg: 'rgba(90,100,114,0.08)',  color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },"
NEW3A = """  superseded: { bg: 'rgba(90,100,114,0.08)',  color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
  obsolete:   { bg: 'rgba(148,48,48,0.07)',   color: '#943030', border: 'rgba(148,48,48,0.2)',  label: 'Obsolete (refused draft)' },"""

if OLD3A not in s3:
    errors.append('FILE3A (DOC_STATUS obsolete): target not found')
elif s3.count(OLD3A) > 1:
    errors.append('FILE3A (DOC_STATUS obsolete): found more than once')
else:
    s3 = s3.replace(OLD3A, NEW3A, 1)
    print('FILE3A PATCH applied: obsolete added to DOC_STATUS')

# 3B — fix shouldBeReadOnly: client read-only on approved OR obsolete; others always editable
OLD3B = """  // Set editor read-only for approved docs viewed by client
  useEffect(() => {
    if (!editor) return
    const shouldBeReadOnly = (userRole === 'client') && docStatus === 'approved'
    editor.setEditable(!shouldBeReadOnly)
  }, [editor, userRole, docStatus])"""

NEW3B = """  // Set editor read-only:
  // - client: read-only when approved or obsolete
  // - everyone else: always editable (superseded/obsolete docs can be opened and read/edited)
  useEffect(() => {
    if (!editor) return
    const shouldBeReadOnly = (userRole === 'client') && ['approved', 'obsolete'].includes(docStatus)
    editor.setEditable(!shouldBeReadOnly)
  }, [editor, userRole, docStatus])"""

if OLD3B not in s3:
    errors.append('FILE3B (shouldBeReadOnly): target not found')
elif s3.count(OLD3B) > 1:
    errors.append('FILE3B (shouldBeReadOnly): found more than once')
else:
    s3 = s3.replace(OLD3B, NEW3B, 1)
    print('FILE3B PATCH applied: shouldBeReadOnly updated')

# 3C — add isClientMR to revise button, and add Revert button below it
OLD3C = """          {(isAdmin || isConsultant) && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Opening…' : '↻ Revise'}</button>
          )}"""

NEW3C = """          {(isAdmin || isConsultant || isClientMR) && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Opening…' : '↻ Revise'}</button>
          )}
          {(isAdmin || isConsultant || isClientMR) && ['draft','inprogress','review'].includes(docStatus) && doc?.revision && doc.revision > 1 && (
            <button onClick={revertDoc} disabled={reverting} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(148,48,48,0.35)', borderRadius: 6, color: '#943030', opacity: reverting ? 0.7 : 1 }}>{reverting ? 'Reverting…' : '⟲ Revert to approved'}</button>
          )}"""

if OLD3C not in s3:
    errors.append('FILE3C (revise+revert buttons): target not found')
elif s3.count(OLD3C) > 1:
    errors.append('FILE3C (revise+revert buttons): found more than once')
else:
    s3 = s3.replace(OLD3C, NEW3C, 1)
    print('FILE3C PATCH applied: revise button + revert button')

# 3D — add reverting state + revertDoc function near revising state/function
OLD3D = "  const [revising, setRevising] = useState(false)"
NEW3D = """  const [revising, setRevising] = useState(false)
  const [reverting, setReverting] = useState(false)"""

if OLD3D not in s3:
    errors.append('FILE3D (reverting state): target not found')
elif s3.count(OLD3D) > 1:
    errors.append('FILE3D (reverting state): found more than once')
else:
    s3 = s3.replace(OLD3D, NEW3D, 1)
    print('FILE3D PATCH applied: reverting state var')

# 3E — add revertDoc() function right after reviseDoc()
OLD3E = """  async function reviseDoc() {
    const msg = latestRevision
      ? `Reopen this document for editing?\\n\\nThe TF v${latestRevision.version} snapshot is preserved. Other approved documents stay locked — only this one will be set to Draft. Once it\\'s re-approved you can update and re-approve the STED to issue a new TF version.`
      : 'Create a new revision? The approved version will be preserved.'
    if (!confirm(msg)) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }"""

NEW3E = """  async function reviseDoc() {
    const msg = latestRevision
      ? `Reopen this document for editing?\\n\\nThe TF v${latestRevision.version} snapshot is preserved. Other approved documents stay locked — only this one will be set to Draft. Once it\\'s re-approved you can update and re-approve the STED to issue a new TF version.`
      : 'Create a new revision? The approved version will be preserved.'
    if (!confirm(msg)) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }

  async function revertDoc() {
    if (!confirm(`Mark this draft as obsolete and restore the previous approved revision?\\n\\nThe draft content will be preserved as an "Obsolete (refused draft)" record — it can still be opened and read later.`)) return
    setReverting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revert`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Revert failed'); return }
      router.push(`/dashboard/projects/${projectId}/documents/${data.restored_id}`)
    } finally { setReverting(false) }
  }"""

if OLD3E not in s3:
    errors.append('FILE3E (revertDoc function): target not found')
elif s3.count(OLD3E) > 1:
    errors.append('FILE3E (revertDoc function): found more than once')
else:
    s3 = s3.replace(OLD3E, NEW3E, 1)
    print('FILE3E PATCH applied: revertDoc() function')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 4 — project page — add obsolete to DOC_STATUS + fix counts + hide from list
# ══════════════════════════════════════════════════════════════════════════════
F4 = 'apps/web/src/app/dashboard/projects/[id]/page.tsx'
with open(F4) as f: s4 = f.read()

# 4A — add obsolete to DOC_STATUS
OLD4A = "  superseded: { bg: 'rgba(90,100,114,0.08)', color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },"
NEW4A = """  superseded: { bg: 'rgba(90,100,114,0.08)', color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
  obsolete:   { bg: 'rgba(148,48,48,0.07)',   color: '#943030', border: 'rgba(148,48,48,0.2)',  label: 'Obsolete' },"""

if OLD4A not in s4:
    errors.append('FILE4A (DOC_STATUS obsolete): target not found')
elif s4.count(OLD4A) > 1:
    errors.append('FILE4A (DOC_STATUS obsolete): found more than once')
else:
    s4 = s4.replace(OLD4A, NEW4A, 1)
    print('FILE4A PATCH applied: obsolete added to project page DOC_STATUS')

# 4B — exclude obsolete from active doc counts (approved/inprog/draft counters)
# The API already filters superseded+obsolete so the counts will be correct once
# we also fix the nonStedDocs filter used for the badge
OLD4B = "  const activeDocs = nonStedDocs.filter((d: any) => d.status !== 'superseded')"
NEW4B = "  const activeDocs = nonStedDocs.filter((d: any) => !['superseded','obsolete'].includes(d.status))"

if OLD4B not in s4:
    errors.append('FILE4B (activeDocs filter): target not found')
elif s4.count(OLD4B) > 1:
    errors.append('FILE4B (activeDocs filter): found more than once')
else:
    s4 = s4.replace(OLD4B, NEW4B, 1)
    print('FILE4B PATCH applied: activeDocs excludes obsolete')

# ══════════════════════════════════════════════════════════════════════════════
# Write files (only if no errors)
# ══════════════════════════════════════════════════════════════════════════════
if errors:
    print('\nERRORS — no files written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(F1, 'w') as f: f.write(s1)
print(f'\nWrote {F1}')
with open(F2, 'w') as f: f.write(s2)
print(f'Wrote {F2}')
with open(F3, 'w') as f: f.write(s3)
print(f'Wrote {F3}')
with open(F4, 'w') as f: f.write(s4)
print(f'Wrote {F4}')
print('\nOK: all patches applied')
