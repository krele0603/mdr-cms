import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

const BUILTIN_VARIABLES = [
  { tag: '$device_name',          label: 'Device name',           type: 'text' },
  { tag: '$manufacturer_name',    label: 'Manufacturer name',     type: 'text' },
  { tag: '$manufacturer_address', label: 'Manufacturer address',  type: 'text' },
  { tag: '$manufacturer_contact', label: 'Manufacturer contact',  type: 'text' },
  { tag: '$manufacturer_email',   label: 'Manufacturer email',    type: 'text' },
  { tag: '$intended_use',         label: 'Intended use',          type: 'rich_text' },
  { tag: '$device_description',   label: 'Device description',    type: 'rich_text' },
  { tag: '$classification',       label: 'Device classification', type: 'text' },
  { tag: '$basic_udi',            label: 'Basic UDI-DI',          type: 'text' },
  { tag: '$notified_body',        label: 'Notified body',         type: 'text' },
]

async function ensureVariableTypeColumn() {
  // Safe to call repeatedly — adds column only if missing
  await query(`
    ALTER TABLE project_variables
    ADD COLUMN IF NOT EXISTS variable_type TEXT NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS is_builtin BOOLEAN NOT NULL DEFAULT true
  `, []).catch(() => {})
}

async function seedVariables(projectId: string) {
  await ensureVariableTypeColumn()
  for (const v of BUILTIN_VARIABLES) {
    await query(
      `INSERT INTO project_variables (project_id, tag, name, value, status, variable_type, is_builtin)
       VALUES ($1::uuid, $2, $3, '', 'draft', $4, true)
       ON CONFLICT (project_id, tag) DO NOTHING`,
      [projectId, v.tag, v.label, v.type]
    )
    // Update type on existing rows in case they were seeded before type column existed
    await query(
      `UPDATE project_variables SET variable_type = $1, is_builtin = true
       WHERE project_id = $2::uuid AND tag = $3 AND variable_type = 'text' AND $1 = 'rich_text'`,
      [v.type, projectId, v.tag]
    )
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await seedVariables(params.id)

  const variables = await query(
    `SELECT pv.id, pv.tag, pv.name, pv.value, pv.status, pv.variable_type, pv.is_builtin,
            pv.suggested_value, pv.approved_at, pv.updated_at,
            u.name AS approved_by_name, su.name AS suggested_by_name
     FROM project_variables pv
     LEFT JOIN users u ON u.id = pv.approved_by
     LEFT JOIN users su ON su.id = pv.suggested_by
     WHERE pv.project_id = $1::uuid
     ORDER BY pv.is_builtin DESC, pv.tag ASC`,
    [params.id]
  )

  const project = await queryOne(
    `SELECT header_logo_url, device_name, manufacturer_name, company_id FROM projects WHERE id = $1::uuid`,
    [params.id]
  )

  return NextResponse.json({ variables, logo: project?.header_logo_url || null, project })
}

// POST — create a custom variable (admin/consultant only)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, variable_type } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const type = variable_type === 'rich_text' ? 'rich_text' : 'text'

  // Generate tag from name: lowercase, replace spaces with _, prefix $
  const tag = '$' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  // Check for tag collision within this project
  const existing = await queryOne(
    `SELECT id FROM project_variables WHERE project_id = $1::uuid AND tag = $2`,
    [params.id, tag]
  )
  if (existing) return NextResponse.json({ error: 'A variable with a similar name already exists' }, { status: 409 })

  const created = await queryOne(
    `INSERT INTO project_variables (project_id, tag, name, value, status, variable_type, is_builtin)
     VALUES ($1::uuid, $2, $3, '', 'draft', $4, false)
     RETURNING *`,
    [params.id, tag, name.trim(), type]
  )

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tag, value, action } = body

  const variable = await queryOne(
    `SELECT * FROM project_variables WHERE project_id = $1::uuid AND tag = $2`,
    [params.id, tag]
  )
  if (!variable) return NextResponse.json({ error: 'Variable not found' }, { status: 404 })

  const isAdminOrConsultant = ['admin', 'consultant'].includes(session.role)

  if (action === 'approve') {
    if (!isAdminOrConsultant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await query(
      `UPDATE project_variables
       SET status = 'approved', approved_by = $1::uuid, approved_at = NOW(),
           value = COALESCE(NULLIF(suggested_value, ''), value), suggested_value = NULL, updated_at = NOW()
       WHERE project_id = $2::uuid AND tag = $3`,
      [session.id, params.id, tag]
    )
  } else if (action === 'request_edit') {
    await query(
      `UPDATE project_variables
       SET suggested_value = $1, suggested_by = $2::uuid, updated_at = NOW()
       WHERE project_id = $3::uuid AND tag = $4`,
      [value, session.id, params.id, tag]
    )
  } else {
    if (variable.status === 'approved' && !isAdminOrConsultant) {
      return NextResponse.json({ error: 'Variable is approved. Use request_edit action.' }, { status: 403 })
    }
    // value may be plain text (text type) or JSON string (rich_text type) — store as-is
    await query(
      `UPDATE project_variables
       SET value = $1, status = 'draft', updated_at = NOW()
       WHERE project_id = $2::uuid AND tag = $3`,
      [value, params.id, tag]
    )
  }

  const updated = await queryOne(
    `SELECT pv.*, u.name AS approved_by_name
     FROM project_variables pv
     LEFT JOIN users u ON u.id = pv.approved_by
     WHERE pv.project_id = $1::uuid AND pv.tag = $2`,
    [params.id, tag]
  )
  return NextResponse.json(updated)
}

// DELETE — remove a custom variable (admin/consultant only, non-builtin only)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag')
  if (!tag) return NextResponse.json({ error: 'tag required' }, { status: 400 })

  const variable = await queryOne(
    `SELECT id, is_builtin FROM project_variables WHERE project_id = $1::uuid AND tag = $2`,
    [params.id, tag]
  )
  if (!variable) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (variable.is_builtin) return NextResponse.json({ error: 'Cannot delete built-in variables' }, { status: 403 })

  await query(
    `DELETE FROM project_variables WHERE project_id = $1::uuid AND tag = $2`,
    [params.id, tag]
  )
  return NextResponse.json({ ok: true })
}
