import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await queryOne(
    `SELECT id, status FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.docId, params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'review') {
    return NextResponse.json({ error: 'Only documents in review can be approved' }, { status: 400 })
  }

  const updated = await queryOne(`
    UPDATE project_documents
    SET status = 'approved', approved_at = NOW(), approved_by = $1::uuid, updated_at = NOW()
    WHERE id = $2::uuid
    RETURNING id, status, approved_at
  `, [session.id, params.docId])

  return NextResponse.json(updated)
}
