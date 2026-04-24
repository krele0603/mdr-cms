import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { annex, name, code } = await req.json()
  if (!annex || !name || !code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const [doc] = await query(`
    INSERT INTO project_documents (project_id, annex, name, code, status)
    VALUES ($1::uuid, $2, $3, $4, 'draft')
    RETURNING id
  `, [params.id, annex, name, code])

  return NextResponse.json({ ok: true, id: doc.id }, { status: 201 })
}
