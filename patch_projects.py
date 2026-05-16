import re

path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Add auditLog to import
content = content.replace(
    "import { query, queryOne } from '@/lib/db'",
    "import { query, queryOne, auditLog } from '@/lib/db'"
)

# 2. Add audit call after project is created (after the return statement, before it)
old = "  return NextResponse.json(project, { status: 201 })"
new = """  await auditLog(session.id, 'project', project.id, 'created', {
    name: project.name,
    device_name: project.device_name,
  })
  return NextResponse.json(project, { status: 201 })"""
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("✓ projects/route.ts patched")
