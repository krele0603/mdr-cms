import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = req.nextUrl.searchParams.get('all') === '1'

  if (all) {
    const revisions = await query(
      `SELECT r.id, r.version, r.version_x, r.version_y, r.version_z,
              r.approved_at, r.notes,
              u.name AS approved_by_name
       FROM tf_revisions r
       LEFT JOIN users u ON u.id = r.approved_by
       WHERE r.project_id = $1::uuid
       ORDER BY r.approved_at DESC`,
      [params.id]
    )
    return NextResponse.json(revisions)
  }

  const revision = await queryOne(
    `SELECT id, version, version_x, version_y, version_z, approved_at, notes
     FROM tf_revisions WHERE project_id = $1::uuid
     ORDER BY approved_at DESC LIMIT 1`,
    [params.id]
  )
  if (!revision) return NextResponse.json(null)
  return NextResponse.json(revision)
}

// POST — start a new TF revision: bulk-supersede all approved docs and create new drafts
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectId = params.id

  // Must have at least one approved TF revision to start another
  const latest = await queryOne(
    `SELECT id, version FROM tf_revisions
     WHERE project_id = $1::uuid ORDER BY approved_at DESC LIMIT 1`,
    [projectId]
  )
  if (!latest) {
    return NextResponse.json({ error: 'No approved TF revision exists' }, { status: 400 })
  }

  // Find all currently-approved non-STED docs
  const approvedDocs = await query(
    `SELECT id, annex, name, code, content, revision, template_version_id, list_document_id
     FROM project_documents
     WHERE project_id = $1::uuid AND annex != 'STED' AND status = 'approved'`,
    [projectId]
  )
  if (approvedDocs.length === 0) {
    return NextResponse.json({ error: 'No approved documents to open for revision' }, { status: 400 })
  }

  // Also grab the approved STED so it gets reopened too
  const stedDoc = await queryOne(
    `SELECT id, annex, name, code, revision, content, template_version_id, list_document_id
     FROM project_documents
     WHERE project_id = $1::uuid AND annex = 'STED' AND status = 'approved'`,
    [projectId]
  )

  const allDocs = stedDoc ? [...approvedDocs, stedDoc] : approvedDocs

  for (const doc of allDocs) {
    // Mark current approved doc as superseded
    await query(
      `UPDATE project_documents SET status = 'superseded', updated_at = NOW() WHERE id = $1::uuid`,
      [doc.id]
    )

    const nextRev = (doc.revision || 1) + 1

    const newDoc = await queryOne(
      `INSERT INTO project_documents
         (project_id, list_document_id, annex, name, code, content, template_version_id, status, revision)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'draft', $8)
       RETURNING id`,
      [projectId, doc.list_document_id || null, doc.annex, doc.name, doc.code,
       doc.content, doc.template_version_id || null, nextRev]
    )

    await query(
      `INSERT INTO document_history (document_id, user_id, action, note)
       VALUES ($1::uuid, $2::uuid, 'revised', $3)`,
      [newDoc!.id, session.id, `New TF revision started after v${latest.version}`]
    )
  }

  await auditLog(session.id, 'project', projectId, 'tf_new_revision_started', {
    based_on: latest.version,
    doc_count: allDocs.length,
  })

  return NextResponse.json({ ok: true, based_on: latest.version, doc_count: allDocs.length })
}
