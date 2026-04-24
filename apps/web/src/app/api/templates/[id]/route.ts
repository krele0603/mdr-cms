import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await queryOne(
    `SELECT t.id, t.name, t.tag_code, t.status, t.created_at, u.name AS created_by_name
     FROM templates t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.id = $1::uuid`,
    [params.id]
  )
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const versions = await query(
    `SELECT tv.id, tv.version, tv.is_current, tv.change_note, tv.created_at, u.name AS created_by_name
     FROM template_versions tv
     LEFT JOIN users u ON u.id = tv.created_by
     WHERE tv.template_id = $1::uuid
     ORDER BY tv.created_at DESC`,
    [params.id]
  )

  return NextResponse.json({ ...template, versions })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, tag_code, status } = body

  if (tag_code) {
    const existing = await queryOne(
      `SELECT id FROM templates WHERE tag_code = $1 AND id != $2::uuid`,
      [tag_code.trim(), params.id]
    )
    if (existing) {
      return NextResponse.json({ error: 'Tag code already in use' }, { status: 409 })
    }
  }

  const template = await queryOne(
    `UPDATE templates
     SET
       name = COALESCE($1, name),
       tag_code = COALESCE($2, tag_code),
       status = COALESCE($3, status),
       updated_at = NOW()
     WHERE id = $4::uuid
     RETURNING id, name, tag_code, status, updated_at`,
    [name?.trim() || null, tag_code?.trim() || null, status || null, params.id]
  )

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}
