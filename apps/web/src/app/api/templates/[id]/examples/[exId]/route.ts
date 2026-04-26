import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; exId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const example = await queryOne(
    `SELECT id, name, description, content, sort_order, created_at
     FROM template_examples WHERE id = $1::uuid AND template_id = $2::uuid`,
    [params.exId, params.id]
  )
  if (!example) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(example)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, content } = body

  const example = await queryOne(`
    UPDATE template_examples
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      content = COALESCE($3, content),
      updated_at = NOW()
    WHERE id = $4::uuid AND template_id = $5::uuid
    RETURNING id, name, description, content, sort_order, updated_at
  `, [name?.trim() || null, description?.trim() ?? null, content || null, params.exId, params.id])

  if (!example) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(example)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const example = await queryOne(
    `SELECT id FROM template_examples WHERE id = $1::uuid AND template_id = $2::uuid`,
    [params.exId, params.id]
  )
  if (!example) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await query(`DELETE FROM template_examples WHERE id = $1::uuid`, [params.exId])
  return NextResponse.json({ ok: true })
}
