import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listId = params.id

  const list = await queryOne(
    `SELECT id, name, description, is_builtin, builtin_key FROM document_lists WHERE id = $1::uuid`,
    [listId]
  )
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const docs = await query(`
    SELECT ld.id, ld.annex, ld.name, ld.code, ld.position,
           t.id AS template_id, t.name AS template_name
    FROM list_documents ld
    LEFT JOIN templates t ON t.id = ld.template_id
    WHERE ld.list_id = $1::uuid
    ORDER BY ld.annex, ld.position, ld.name
  `, [listId])

  return NextResponse.json({ list, docs })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const listId = params.id
  const body = await req.json()
  const { template_id, annex } = body

  if (!template_id) return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
  if (!annex) return NextResponse.json({ error: 'annex is required' }, { status: 400 })

  const template = await queryOne(
    `SELECT id, name, tag_code FROM templates WHERE id = $1::uuid`,
    [template_id]
  )
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const existing = await queryOne(
    `SELECT id FROM list_documents WHERE list_id = $1::uuid AND template_id = $2::uuid`,
    [listId, template_id]
  )
  if (existing) return NextResponse.json({ error: 'This template is already in the list' }, { status: 409 })

  const docs = await query<{ id: string }>(`
    INSERT INTO list_documents (list_id, annex, name, code, template_id, position)
    VALUES ($1::uuid, $2, $3, $4, $5::uuid, 0)
    RETURNING id
  `, [listId, annex, template.name, template.tag_code, template_id])

  return NextResponse.json({ ok: true, id: docs[0].id }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const listId = params.id

  const list = await queryOne(
    `SELECT id, is_builtin, name FROM document_lists WHERE id = $1::uuid`,
    [listId]
  )
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (list.is_builtin) {
    return NextResponse.json({ error: 'Built-in TF structures cannot be deleted' }, { status: 403 })
  }

  // Nullify list_id on projects that use this list (projects and their docs are unaffected)
  const affected = await queryOne(
    `SELECT COUNT(*) AS count FROM projects WHERE list_id = $1::uuid`,
    [listId]
  )
  await query(
    `UPDATE projects SET list_id = NULL WHERE list_id = $1::uuid`,
    [listId]
  )

  await query(`DELETE FROM document_lists WHERE id = $1::uuid`, [listId])

  return NextResponse.json({ ok: true, affected_projects: Number(affected?.count || 0) })
}
