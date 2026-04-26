import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

const BUILTIN_VARIABLES = [
  { tag: '$device_name',          label: 'Device name' },
  { tag: '$manufacturer_name',    label: 'Manufacturer name' },
  { tag: '$manufacturer_address', label: 'Manufacturer address' },
  { tag: '$manufacturer_contact', label: 'Manufacturer contact' },
  { tag: '$manufacturer_email',   label: 'Manufacturer email' },
  { tag: '$intended_use',         label: 'Intended use' },
  { tag: '$device_description',   label: 'Device description' },
  { tag: '$classification',       label: 'Device classification' },
  { tag: '$basic_udi',            label: 'Basic UDI-DI' },
  { tag: '$notified_body',        label: 'Notified body' },
]

async function seedVariables(projectId: string) {
  for (const v of BUILTIN_VARIABLES) {
    await query(
      `INSERT INTO project_variables (project_id, tag, name, value, status)
       VALUES ($1::uuid, $2, $3, '', 'draft')
       ON CONFLICT (project_id, tag) DO NOTHING`,
      [projectId, v.tag, v.label]
    )
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await seedVariables(params.id)

  const variables = await query(
    `SELECT pv.id, pv.tag, pv.name, pv.value, pv.status,
            pv.suggested_value, pv.approved_at, pv.updated_at,
            u.name AS approved_by_name, su.name AS suggested_by_name
     FROM project_variables pv
     LEFT JOIN users u ON u.id = pv.approved_by
     LEFT JOIN users su ON su.id = pv.suggested_by
     WHERE pv.project_id = $1::uuid
     ORDER BY pv.tag ASC`,
    [params.id]
  )

  const project = await queryOne(
    `SELECT header_logo_url, device_name, manufacturer_name FROM projects WHERE id = $1::uuid`,
    [params.id]
  )

  return NextResponse.json({ variables, logo: project?.header_logo_url || null, project })
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
