import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await queryOne(
    `SELECT t.id, t.name, t.tag_code, t.annex, t.status, t.created_at, u.name AS created_by_name
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
  const { name, tag_code, annex, status } = body

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
       name     = COALESCE($1, name),
       tag_code = COALESCE($2, tag_code),
       annex    = COALESCE($3, annex),
       status   = COALESCE($4, status),
       updated_at = NOW()
     WHERE id = $5::uuid
     RETURNING id, name, tag_code, annex, status, updated_at`,
    [
      name?.trim() || null,
      tag_code?.trim() || null,
      annex || null,
      status || null,
      params.id,
    ]
  )

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await queryOne(
    `SELECT id, name FROM templates WHERE id = $1::uuid`,
    [params.id]
  )
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if template is in use by any project documents
  const inUse = await queryOne(
    `SELECT pd.id FROM project_documents pd
     JOIN template_versions tv ON tv.id = pd.template_version_id
     WHERE tv.template_id = $1::uuid
     LIMIT 1`,
    [params.id]
  )
  if (inUse) {
    return NextResponse.json(
      { error: 'This template is used in one or more project records and cannot be deleted. Delete those projects first.' },
      { status: 409 }
    )
  }

  // Also check list_documents references
  const inList = await queryOne(
    `SELECT id FROM list_documents WHERE template_id = $1::uuid LIMIT 1`,
    [params.id]
  )
  if (inList) {
    return NextResponse.json(
      { error: 'This template is used in one or more TF structures. Remove it from those structures first.' },
      { status: 409 }
    )
  }

  await query(`DELETE FROM template_versions WHERE template_id = $1::uuid`, [params.id])
  await query(`DELETE FROM templates WHERE id = $1::uuid`, [params.id])

  return NextResponse.json({ ok: true })
}
