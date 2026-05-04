import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT id, tag, name, value, is_global, created_at, updated_at
     FROM company_variables
     WHERE company_id = $1::uuid
     ORDER BY is_global DESC, tag ASC`,
    [params.id]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tag, name, value } = await req.json()
  if (!tag?.trim() || !name?.trim())
    return NextResponse.json({ error: 'tag and name required' }, { status: 400 })

  const existing = await queryOne(
    `SELECT id FROM company_variables WHERE company_id = $1::uuid AND tag = $2`,
    [params.id, tag.trim()]
  )
  if (existing) return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })

  const row = await queryOne(
    `INSERT INTO company_variables (company_id, tag, name, value, is_global)
     VALUES ($1::uuid, $2, $3, $4, false)
     RETURNING id, tag, name, value, is_global`,
    [params.id, tag.trim(), name.trim(), value || '']
  )
  return NextResponse.json(row, { status: 201 })
}
