import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectId = params.id
  const docId = params.docId
  const userId = session.id

  const doc = await queryOne(
    `SELECT id, status FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [docId, projectId]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'review') {
    return NextResponse.json({ error: 'Only documents in review can be approved' }, { status: 400 })
  }

  await query(
    `UPDATE project_documents SET status = 'approved', updated_at = NOW() WHERE id = $1::uuid`,
    [docId]
  )

  await query(
    `INSERT INTO document_history (document_id, user_id, action) VALUES ($1::uuid, $2::uuid, 'approved')`,
    [docId, userId]
  )

  return NextResponse.json({ ok: true, status: 'approved' })
}
