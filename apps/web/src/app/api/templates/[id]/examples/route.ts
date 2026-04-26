import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const examples = await query(`
    SELECT te.id, te.name, te.description, te.content, te.sort_order, te.created_at,
           u.name AS created_by_name
    FROM template_examples te
    LEFT JOIN users u ON u.id = te.created_by
    WHERE te.template_id = $1::uuid
    ORDER BY te.sort_order ASC, te.created_at ASC
  `, [params.id])

  return NextResponse.json(examples)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, content } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Get next sort_order
  const maxOrder = await queryOne(
    `SELECT COALESCE(MAX(sort_order), -1) AS max FROM template_examples WHERE template_id = $1::uuid`,
    [params.id]
  )

  const example = await queryOne(`
    INSERT INTO template_examples (template_id, name, description, content, sort_order, created_by)
    VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
    RETURNING id, name, description, content, sort_order, created_at
  `, [params.id, name.trim(), description?.trim() || null, content || {}, (maxOrder?.max ?? -1) + 1, session.id])

  return NextResponse.json(example, { status: 201 })
}
