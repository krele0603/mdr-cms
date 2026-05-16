import re

# ── eqms/documents/[id]/route.ts (PATCH = content save) ──────────────────────
path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/[id]/route.ts'
with open(path, 'r') as f:
    content = f.read()

if 'auditLog' not in content:
    # Add import
    for old_imp in [
        "import { query, queryOne } from '@/lib/db'",
        "import { query } from '@/lib/db'",
        "import { queryOne } from '@/lib/db'",
    ]:
        if old_imp in content:
            content = content.replace(old_imp, old_imp.rstrip("'") + "'\nimport { auditLog } from '@/lib/db'")
            break

    # Add audit before final return in PATCH
    # Find last return NextResponse.json in PATCH
    old = "  return NextResponse.json({ ok: true })"
    new = """  await auditLog(session.id, 'eqms_document', params.id, 'content_saved', {})
  return NextResponse.json({ ok: true })"""
    content = content.replace(old, new, 1)  # only first occurrence (PATCH)

    with open(path, 'w') as f:
        f.write(content)
    print("✓ eqms/documents/[id]/route.ts patched")
else:
    print("⚠ eqms/documents/[id]/route.ts already has auditLog")

# ── eqms/documents/[id]/submit/route.ts ──────────────────────────────────────
path2 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/[id]/submit/route.ts'
with open(path2, 'r') as f:
    c2 = f.read()

if 'auditLog' not in c2:
    for old_imp in ["import { query, queryOne } from '@/lib/db'", "import { query } from '@/lib/db'", "import { queryOne } from '@/lib/db'"]:
        if old_imp in c2:
            c2 = c2.replace(old_imp, old_imp + "\nimport { auditLog } from '@/lib/db'")
            break
    # Add before last return
    c2 = c2.replace(
        "  return NextResponse.json({ ok: true })",
        "  await auditLog(session.id, 'eqms_document', params.id, 'submitted', {})\n  return NextResponse.json({ ok: true })"
    )
    with open(path2, 'w') as f:
        f.write(c2)
    print("✓ eqms/documents/[id]/submit/route.ts patched")
else:
    print("⚠ submit route already has auditLog")

# ── eqms/documents/[id]/approve/route.ts ─────────────────────────────────────
path3 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/[id]/approve/route.ts'
with open(path3, 'r') as f:
    c3 = f.read()

if 'auditLog' not in c3:
    for old_imp in ["import { query, queryOne } from '@/lib/db'", "import { query } from '@/lib/db'", "import { queryOne } from '@/lib/db'"]:
        if old_imp in c3:
            c3 = c3.replace(old_imp, old_imp + "\nimport { auditLog } from '@/lib/db'")
            break
    c3 = c3.replace(
        "  return NextResponse.json({ ok: true })",
        "  await auditLog(session.id, 'eqms_document', params.id, 'approved', {})\n  return NextResponse.json({ ok: true })"
    )
    with open(path3, 'w') as f:
        f.write(c3)
    print("✓ eqms/documents/[id]/approve/route.ts patched")
else:
    print("⚠ approve route already has auditLog")

# ── eqms/documents/[id]/revise/route.ts ──────────────────────────────────────
path4 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/[id]/revise/route.ts'
with open(path4, 'r') as f:
    c4 = f.read()

if 'auditLog' not in c4:
    for old_imp in ["import { query, queryOne } from '@/lib/db'", "import { query } from '@/lib/db'", "import { queryOne } from '@/lib/db'"]:
        if old_imp in c4:
            c4 = c4.replace(old_imp, old_imp + "\nimport { auditLog } from '@/lib/db'")
            break
    c4 = c4.replace(
        "  return NextResponse.json({ ok: true })",
        "  await auditLog(session.id, 'eqms_document', params.id, 'revised', {})\n  return NextResponse.json({ ok: true })"
    )
    with open(path4, 'w') as f:
        f.write(c4)
    print("✓ eqms/documents/[id]/revise/route.ts patched")
else:
    print("⚠ revise route already has auditLog")
