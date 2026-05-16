path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/[id]/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Add auditLog to import
content = content.replace(
    "import { query, queryOne } from '@/lib/db'",
    "import { query, queryOne, auditLog } from '@/lib/db'"
)

# 2. PATCH — add audit before return
old = "  return NextResponse.json({ ok: true })\n}\n\nexport async function DELETE("
new = """  await auditLog(session.id, 'project', params.id, 'updated', { fields: Object.keys(body) })
  return NextResponse.json({ ok: true })
}

export async function DELETE("""
content = content.replace(old, new)

# 3. DELETE — add audit before final return
old = "  await query(`DELETE FROM projects WHERE id = $1::uuid`, [params.id])\n  return NextResponse.json({ ok: true })"
new = """  await query(`DELETE FROM projects WHERE id = $1::uuid`, [params.id])
  await auditLog(session.id, 'project', params.id, 'deleted', { name: project.name })
  return NextResponse.json({ ok: true })"""
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("✓ projects/[id]/route.ts patched")
