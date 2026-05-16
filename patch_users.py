import re

# ── users/route.ts (POST = create user) ──────────────────────────────────────
path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/users/route.ts'
with open(path, 'r') as f:
    content = f.read()

if 'auditLog' not in content:
    content = content.replace(
        "import { query, queryOne } from '@/lib/db'",
        "import { query, queryOne, auditLog } from '@/lib/db'"
    )
    # Add audit after user insert — find the return of POST
    # Insert before last return in POST function
    old = "  return NextResponse.json(user, { status: 201 })"
    new = """  await auditLog(session.id, 'user', user.id, 'created', { name: user.name, role: user.role, email: user.email })
  return NextResponse.json(user, { status: 201 })"""
    content = content.replace(old, new)

    with open(path, 'w') as f:
        f.write(content)
    print("✓ users/route.ts patched")
else:
    print("⚠ users/route.ts already has auditLog")

# ── users/[id]/route.ts (PATCH + DELETE) ─────────────────────────────────────
path2 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/users/[id]/route.ts'
with open(path2, 'r') as f:
    content2 = f.read()

if 'auditLog' not in content2:
    content2 = content2.replace(
        "import { query, queryOne } from '@/lib/db'",
        "import { query, queryOne, auditLog } from '@/lib/db'"
    )
    # PATCH return
    old_patch = "  return NextResponse.json({ ok: true })\n}\n\nexport async function DELETE("
    new_patch = """  await auditLog(session.id, 'user', params.id, 'updated', { fields: Object.keys(body) })
  return NextResponse.json({ ok: true })
}

export async function DELETE("""
    content2 = content2.replace(old_patch, new_patch)

    # DELETE — find the delete query and add audit after
    old_delete = "  await query('DELETE FROM users WHERE id = $1::uuid', [uid])\n  return NextResponse.json({ ok: true })"
    new_delete = """  await query('DELETE FROM users WHERE id = $1::uuid', [uid])
  await auditLog(session.id, 'user', uid, 'deleted', { email: user.email })
  return NextResponse.json({ ok: true })"""
    content2 = content2.replace(old_delete, new_delete)

    with open(path2, 'w') as f:
        f.write(content2)
    print("✓ users/[id]/route.ts patched")
else:
    print("⚠ users/[id]/route.ts already has auditLog")
