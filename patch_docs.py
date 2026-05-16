path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/[id]/documents/[docId]/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Add auditLog to import
content = content.replace(
    "from '@/lib/db'",
    "from '@/lib/db'\nimport { auditLog } from '@/lib/db'"
)
# Clean up duplicate import if already has queryOne
content = content.replace(
    "import { queryOne } from '@/lib/db'\nimport { auditLog } from '@/lib/db'",
    "import { queryOne, auditLog } from '@/lib/db'"
)

# 2. After PATCH returns doc, add audit — insert before final return
old = "  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })\n  return NextResponse.json(doc)\n}"
new = """  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Audit status changes specifically
  if (body.status !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'status_changed', {
      status: body.status,
      project_id: params.id,
    })
  } else if (body.content !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'content_saved', {
      project_id: params.id,
    })
  }
  return NextResponse.json(doc)
}"""
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("✓ projects/[id]/documents/[docId]/route.ts patched")
