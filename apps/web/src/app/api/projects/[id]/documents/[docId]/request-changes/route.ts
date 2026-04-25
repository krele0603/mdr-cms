import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { reason } = body

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'A reason is required when requesting changes' }, { status: 400 })
  }

  const doc = await queryOne(
    `SELECT id, status FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.docId, params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'review') {
    return NextResponse.json({ error: 'Only documents in review can have changes requested' }, { status: 400 })
  }

  // Set back to inprogress
  await queryOne(`
    UPDATE project_documents
    SET status = 'inprogress', updated_at = NOW()
    WHERE id = $1::uuid
  `, [params.docId])

  // Post auto-comment with reason
  await query(`
    INSERT INTO document_comments (document_id, author_id, content)
    VALUES ($1::uuid, $2::uuid, $3)
  `, [
    params.docId,
    session.id,
    `⚠ Changes requested: ${reason.trim()}`,
  ])

  return NextResponse.json({ ok: true, status: 'inprogress' })
}
