import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lists = await query(`
    SELECT id, name, description, is_builtin, builtin_key,
      (SELECT COUNT(*) FROM list_documents WHERE list_id = document_lists.id) as doc_count
    FROM document_lists
    ORDER BY is_builtin DESC, name
  `)

  return NextResponse.json({ lists })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, clone_from } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [list] = await query<{ id: string }>(`
    INSERT INTO document_lists (name, description, is_builtin, created_by)
    VALUES ($1, $2, false, $3)
    RETURNING id
  `, [name, description || null, session.id])

  if (clone_from) {
    const source = await queryOne('SELECT id FROM document_lists WHERE id = $1', [clone_from])
    if (source) {
      await query(`
        INSERT INTO list_documents (list_id, annex, name, code, position)
        SELECT $1, annex, name, code, position
        FROM list_documents WHERE list_id = $2
      `, [list.id, clone_from])
    }
  }

  return NextResponse.json({ ok: true, id: list.id }, { status: 201 })
}
