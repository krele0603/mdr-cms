import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  let projects
  if (session.role === 'admin' || session.role === 'consultant') {
    projects = await query(`
      SELECT p.id, p.name, p.device_name, p.manufacturer_name, p.status,
             p.created_at, p.updated_at, u.name AS created_by_name,
             dl.name AS list_name,
             COUNT(DISTINCT pd.id) AS document_count,
             COUNT(DISTINCT CASE WHEN pd.status = 'approved' THEN pd.id END) AS approved_count
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN document_lists dl ON dl.id = p.list_id
      LEFT JOIN project_documents pd ON pd.project_id = p.id
      WHERE ($1 = '' OR p.name ILIKE $2 OR p.device_name ILIKE $2)
      GROUP BY p.id, u.name, dl.name
      ORDER BY p.updated_at DESC
    `, [search, `%${search}%`])
  } else {
    projects = await query(`
      SELECT p.id, p.name, p.device_name, p.manufacturer_name, p.status,
             p.created_at, p.updated_at, dl.name AS list_name,
             COUNT(DISTINCT pd.id) AS document_count,
             COUNT(DISTINCT CASE WHEN pd.status = 'approved' THEN pd.id END) AS approved_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1::uuid
      LEFT JOIN document_lists dl ON dl.id = p.list_id
      LEFT JOIN project_documents pd ON pd.project_id = p.id
      GROUP BY p.id, dl.name
      ORDER BY p.updated_at DESC
    `, [session.id])
  }

  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, device_name, manufacturer_name, manufacturer_country, list_id } = body

  if (!name?.trim() || !device_name?.trim() || !list_id) {
    return NextResponse.json({ error: 'name, device_name, and list_id are required' }, { status: 400 })
  }

  // Create project
  const project = await queryOne(`
    INSERT INTO projects (name, device_name, manufacturer_name, manufacturer_country, list_id, created_by, status)
    VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, 'draft')
    RETURNING id, name, device_name, status
  `, [
    name.trim(),
    device_name.trim(),
    manufacturer_name?.trim() || '',
    manufacturer_country?.trim() || null,
    list_id,
    session.id,
  ])

  // Add creator as admin member
  await query(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES ($1::uuid, $2::uuid, 'admin')
    ON CONFLICT DO NOTHING
  `, [project.id, session.id])

  // Seed built-in variables
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
  for (const v of BUILTIN_VARIABLES) {
    await query(`
      INSERT INTO project_variables (project_id, tag, name, value, status)
      VALUES ($1::uuid, $2, $3, '', 'draft')
      ON CONFLICT (project_id, tag) DO NOTHING
    `, [project.id, v.tag, v.label])
  }

  // Auto-populate device_name and manufacturer_name variables from project fields
  await query(`
    UPDATE project_variables SET value = $1 WHERE project_id = $2::uuid AND tag = '$device_name'
  `, [device_name.trim(), project.id])
  if (manufacturer_name?.trim()) {
    await query(`
      UPDATE project_variables SET value = $1 WHERE project_id = $2::uuid AND tag = '$manufacturer_name'
    `, [manufacturer_name.trim(), project.id])
  }

  // Create documents from list
  interface ListDoc {
    id: string; annex: string; name: string; code: string; template_id: string | null
  }
  const listDocs = await query<ListDoc>(`
    SELECT id, annex, name, code, template_id
    FROM list_documents
    WHERE list_id = $1::uuid
    ORDER BY annex, position
  `, [list_id])

  for (const d of listDocs) {
    let content: any = {}
    let templateVersionId: string | null = null

    if (d.template_id) {
      const tv = await queryOne<{ id: string; content: any }>(`
        SELECT id, content
        FROM template_versions
        WHERE template_id = $1::uuid AND is_current = TRUE
        LIMIT 1
      `, [d.template_id])
      if (tv) {
        content = tv.content ?? {}
        templateVersionId = tv.id
      }
    }

    await query(`
      INSERT INTO project_documents
        (project_id, list_document_id, annex, name, code, status, content, template_version_id)
      VALUES
        ($1::uuid, $2::uuid, $3, $4, $5, 'draft', $6, $7)
    `, [
      project.id,
      d.id,
      d.annex,
      d.name,
      d.code,
      JSON.stringify(content),
      templateVersionId,
    ])
  }

  return NextResponse.json(project, { status: 201 })
}
