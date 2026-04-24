import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await query(`
    SELECT
      t.id,
      t.name,
      t.tag_code,
      t.status,
      t.created_at,
      tv.version,
      tv.id AS version_id,
      tv.change_note,
      tv.created_at AS version_created_at,
      u.name AS created_by_name,
      COUNT(DISTINCT ld.id)::int AS list_count,
      COUNT(DISTINCT pd.project_id)::int AS project_count
    FROM templates t
    LEFT JOIN template_versions tv ON tv.template_id = t.id AND tv.is_current = TRUE
    LEFT JOIN users u ON u.id = t.created_by
    LEFT JOIN list_documents ld ON ld.template_id = t.id
    LEFT JOIN project_documents pd ON pd.template_version_id = tv.id
    GROUP BY t.id, t.name, t.tag_code, t.status, t.created_at, tv.version, tv.id, tv.change_note, tv.created_at, u.name
    ORDER BY t.name ASC
  `)

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, tag_code } = body

  if (!name?.trim() || !tag_code?.trim()) {
    return NextResponse.json({ error: 'Name and tag code are required' }, { status: 400 })
  }

  // Check tag_code uniqueness
  const existing = await queryOne(
    `SELECT id FROM templates WHERE tag_code = $1`,
    [tag_code.trim()]
  )
  if (existing) {
    return NextResponse.json({ error: 'Tag code already in use' }, { status: 409 })
  }

  const template = await queryOne(
    `INSERT INTO templates (name, tag_code, status, created_by)
     VALUES ($1, $2, 'draft', $3::uuid)
     RETURNING id, name, tag_code, status, created_at`,
    [name.trim(), tag_code.trim(), session.id]
  )

  // Create initial empty version v1
  await queryOne(
    `INSERT INTO template_versions (template_id, version, content, example_content, change_note, is_current, created_by)
     VALUES ($1::uuid, 'v1', '{}', '{}', 'Initial version', TRUE, $2::uuid)`,
    [template!.id, session.id]
  )

  return NextResponse.json(template, { status: 201 })
}
