#!/usr/bin/env python3
"""
Two fixes for project delete:

1. postgres/migrations/008_cascade_project_delete.sql  — already a separate file to run
2. api/projects/[id]/route.ts — wrap DELETE in try/catch, return proper JSON error
   so the frontend never gets an empty body

Run from repo root:
  python3 patches/fix_project_delete.py
"""

import sys

errors = []

F1 = 'apps/web/src/app/api/projects/[id]/route.ts'
with open(F1) as f: s1 = f.read()

OLD1 = """  const project = await queryOne(
    `SELECT id, name FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await query(`DELETE FROM projects WHERE id = $1::uuid`, [params.id])
  await auditLog(session.id, 'project', params.id, 'deleted', { name: project.name })
  return NextResponse.json({ ok: true })
}"""

NEW1 = """  const project = await queryOne(
    `SELECT id, name FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await query(`DELETE FROM projects WHERE id = $1::uuid`, [params.id])
    await auditLog(session.id, 'project', params.id, 'deleted', { name: project.name })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Project delete error:', err)
    // FK violation — dependent rows exist without CASCADE
    if (err.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete: project has related records. Run migration 008_cascade_project_delete.sql first.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}"""

if OLD1 not in s1:
    errors.append('FILE1 (DELETE try/catch): target not found')
elif s1.count(OLD1) > 1:
    errors.append('FILE1 (DELETE try/catch): found more than once')
else:
    s1 = s1.replace(OLD1, NEW1, 1)
    print('FILE1 PATCH applied: DELETE route wrapped in try/catch')

if errors:
    print('\nERRORS — no files written:')
    for e in errors: print(f'  • {e}')
    sys.exit(1)

with open(F1, 'w') as f: f.write(s1)
print(f'Wrote {F1}')
print('\nOK: all patches applied')
