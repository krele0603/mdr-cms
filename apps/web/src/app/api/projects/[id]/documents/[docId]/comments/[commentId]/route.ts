import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string; commentId: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { resolved } = body

  const comment = await queryOne(`
    UPDATE document_comments
    SET
      resolved = $1,
      resolved_by = $2,
      resolved_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = $3::uuid AND document_id = $4::uuid
    RETURNING id, resolved, resolved_at
  `, [resolved, resolved ? session.id : null, params.commentId, params.docId])

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(comment)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only author or admin can delete
  const comment = await queryOne(
    `SELECT id, author_id FROM document_comments WHERE id = $1::uuid AND document_id = $2::uuid`,
    [params.commentId, params.docId]
  )
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.author_id !== session.id && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await query(`DELETE FROM document_comments WHERE id = $1::uuid`, [params.commentId])
  return NextResponse.json({ ok: true })
}
