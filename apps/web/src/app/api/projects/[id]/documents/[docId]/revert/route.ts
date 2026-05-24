import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

// POST — mark this draft revision as 'obsolete' and restore the superseded doc to 'approved'
// docId must be a draft doc whose previous revision exists as 'superseded'
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant', 'client-MR'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectId = params.id
  const docId = params.docId

  // Load the target doc — must be a draft (or inprogress/review) that resulted from a revise
  const doc = await queryOne(
    `SELECT * FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [docId, projectId]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'inprogress', 'review'].includes(doc.status)) {
    return NextResponse.json({ error: 'Only draft/in-progress/review documents can be reverted' }, { status: 400 })
  }
  if (!doc.revision || doc.revision < 2) {
    return NextResponse.json({ error: 'No previous revision to restore' }, { status: 400 })
  }

  // Find the most recent superseded doc with the previous revision number (same name+code)
  const prevRevision = doc.revision - 1
  const superseded = await queryOne(
    `SELECT id FROM project_documents
     WHERE project_id = $1::uuid
       AND name = $2 AND code = $3 AND annex = $4
       AND status = 'superseded'
       AND revision = $5
     ORDER BY updated_at DESC LIMIT 1`,
    [projectId, doc.name, doc.code, doc.annex, prevRevision]
  )
  if (!superseded) {
    return NextResponse.json({ error: 'Previous approved revision not found' }, { status: 404 })
  }

  // Mark the current draft as obsolete
  await query(
    `UPDATE project_documents SET status = 'obsolete', updated_at = NOW() WHERE id = $1::uuid`,
    [docId]
  )

  // Restore the superseded doc to approved
  await query(
    `UPDATE project_documents SET status = 'approved', updated_at = NOW() WHERE id = $1::uuid`,
    [superseded.id]
  )

  await query(
    `INSERT INTO document_history (document_id, user_id, action, note)
     VALUES ($1::uuid, $2::uuid, 'reverted', $3)`,
    [superseded.id, session.id,
     `Revision reverted: draft rev.${doc.revision} marked obsolete, rev.${prevRevision} restored to approved`]
  )

  await auditLog(session.id, 'document', docId, 'revert_to_approved', {
    obsolete_id: docId,
    restored_id: superseded.id,
    revision: prevRevision,
  })

  return NextResponse.json({ ok: true, restored_id: superseded.id })
}
