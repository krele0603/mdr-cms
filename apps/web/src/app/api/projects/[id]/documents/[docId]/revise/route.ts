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
    `SELECT * FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [docId, projectId]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved documents can be revised' }, { status: 400 })
  }

  await query(
    `UPDATE project_documents SET status = 'superseded', updated_at = NOW() WHERE id = $1::uuid`,
    [docId]
  )

  const nextRevision = (doc.revision || 1) + 1

  const newDoc = await queryOne(`
    INSERT INTO project_documents
      (project_id, list_document_id, annex, name, code, content, template_version_id, status, revision)
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'draft', $8)
    RETURNING id, name, code, annex, status, revision
  `, [
    projectId,
    doc.list_document_id || null,
    doc.annex,
    doc.name,
    doc.code,
    doc.content,
    doc.template_version_id || null,
    nextRevision,
  ])

  await query(
    `INSERT INTO document_history (document_id, user_id, action, note) VALUES ($1::uuid, $2::uuid, 'revised', $3)`,
    [newDoc.id, userId, `Revision ${nextRevision} created from approved rev.${doc.revision || 1}`]
  )

  return NextResponse.json(newDoc, { status: 201 })
}
