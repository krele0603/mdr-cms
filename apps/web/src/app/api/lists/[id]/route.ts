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
    `SELECT id, annex, name, code, position
     FROM list_documents
     WHERE list_id = $1::uuid
     ORDER BY annex, position, name`,
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

  const { annex, name, code } = await req.json()
  if (!annex || !name || !code) {
    return NextResponse.json({ error: 'Annex, name and code are required' }, { status: 400 })
  }

  const [doc] = await query<{ id: string }>(`
    INSERT INTO list_documents (list_id, annex, name, code, position)
    VALUES ($1::uuid, $2, $3, $4, 0)
    RETURNING id
  `, [params.id, annex, name, code])

  return NextResponse.json({ ok: true, id: doc.id }, { status: 201 })
}

