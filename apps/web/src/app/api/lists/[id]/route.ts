import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await queryOne(
    'SELECT id, name, description, is_builtin, builtin_key FROM document_lists WHERE id = $1::uuid',
    [params.id]
  )
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const docs = await query(
    `SELECT ld.id, ld.annex, ld.name, ld.code, ld.position,
            t.id AS template_id, t.name AS template_name
     FROM list_documents ld
     LEFT JOIN templates t ON t.id = ld.template_id
     WHERE ld.list_id = $1::uuid
     ORDER BY ld.annex, ld.position, ld.name`,
    [params.id]
  )

  return NextResponse.json({ list, docs })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { template_id, annex } = body

  if (!template_id) {
    return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
  }
  if (!annex) {
    return NextResponse.json({ error: 'annex is required' }, { status: 400 })
  }

  // Get name and tag_code from template
  const template = await queryOne(
    `SELECT id, name, tag_code FROM templates WHERE id = $1::uuid`,
    [template_id]
  )
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Check not already in this list
  const existing = await queryOne(
    `SELECT id FROM list_documents WHERE list_id = $1::uuid AND template_id = $2::uuid`,
    [params.id, template_id]
  )
  if (existing) {
    return NextResponse.json({ error: 'This template is already in the list' }, { status: 409 })
  }

  const [doc] = await query<{ id: string }>(`
    INSERT INTO list_documents (list_id, annex, name, code, template_id, position)
    VALUES ($1::uuid, $2, $3, $4, $5::uuid, 0)
    RETURNING id
  `, [params.id, annex, template.name, template.tag_code, template_id])

  return NextResponse.json({ ok: true, id: doc.id }, { status: 201 })
}
