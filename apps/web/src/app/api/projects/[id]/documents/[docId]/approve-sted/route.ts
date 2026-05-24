import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant', 'client-MR'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectId = params.id
  const docId = params.docId

  const { version_x, version_y, version_z, notes } = await req.json()

  if (version_x == null || version_y == null || version_z == null) {
    return NextResponse.json({ error: 'version_x, version_y, version_z are required' }, { status: 400 })
  }

  // Validate version numbers are non-negative integers
  const x = parseInt(version_x), y = parseInt(version_y), z = parseInt(version_z)
  if (isNaN(x) || isNaN(y) || isNaN(z) || x < 1 || y < 0 || z < 0) {
    return NextResponse.json({ error: 'Invalid version numbers. X must be ≥ 1, Y and Z must be ≥ 0' }, { status: 400 })
  }

  // Check new version is greater than latest
  const latest = await queryOne(
    `SELECT version_x, version_y, version_z FROM tf_revisions
     WHERE project_id = $1::uuid ORDER BY approved_at DESC LIMIT 1`,
    [projectId]
  )
  if (latest) {
    const isGreater = x > latest.version_x ||
      (x === latest.version_x && y > latest.version_y) ||
      (x === latest.version_x && y === latest.version_y && z > latest.version_z)
    if (!isGreater) {
      return NextResponse.json({
        error: `New version ${x}.${y}.${z} must be greater than current ${latest.version_x}.${latest.version_y}.${latest.version_z}`
      }, { status: 400 })
    }
  }

  // Check STED document exists and is in review
  const stedDoc = await queryOne(
    `SELECT id, status, annex FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [docId, projectId]
  )
  if (!stedDoc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (stedDoc.annex !== 'STED') return NextResponse.json({ error: 'This endpoint is only for STED documents' }, { status: 400 })
  if (stedDoc.status !== 'review') return NextResponse.json({ error: 'STED must be in review to approve' }, { status: 400 })

  // Check ALL non-STED documents in project are approved — hard block
  const unapproved = await query(
    `SELECT id, annex, name, status FROM project_documents
     WHERE project_id = $1::uuid AND annex != 'STED' AND status != 'approved'`,
    [projectId]
  )
  if (unapproved.length > 0) {
    return NextResponse.json({
      error: `Cannot approve STED: ${unapproved.length} document(s) are not yet approved`,
      unapproved_docs: unapproved.map((d: any) => ({ annex: d.annex, name: d.name, status: d.status }))
    }, { status: 400 })
  }

  const version = `${x}.${y}.${z}`

  // Approve the STED document
  await query(
    `UPDATE project_documents
     SET status = 'approved', approved_at = NOW(), approved_by = $1::uuid,
         approved_content = content, updated_at = NOW()
     WHERE id = $2::uuid`,
    [session.id, docId]
  )

  // Create TF revision record
  const revision = await queryOne(
    `INSERT INTO tf_revisions (project_id, version, version_x, version_y, version_z, sted_document_id, approved_by, notes)
     VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, $8)
     RETURNING id`,
    [projectId, version, x, y, z, docId, session.id, notes || null]
  )

  // Snapshot all approved documents into tf_revision_documents
  const approvedDocs = await query(
    `SELECT id, annex, name, code, content, revision FROM project_documents
     WHERE project_id = $1::uuid AND status = 'approved'`,
    [projectId]
  )

  for (const doc of approvedDocs) {
    await query(
      `INSERT INTO tf_revision_documents
       (revision_id, document_id, document_name, document_code, annex, content_snapshot, document_revision)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)`,
      [revision!.id, doc.id, doc.name, doc.code, doc.annex, JSON.stringify(doc.content), doc.revision || 1]
    )
  }

  // Record history
  await query(
    `INSERT INTO document_history (document_id, user_id, action)
     VALUES ($1::uuid, $2::uuid, 'approved')`,
    [docId, session.id]
  )

  await auditLog(session.id, 'tf_revision', revision!.id, 'tf_approved', {
    project_id: projectId, version, doc_count: approvedDocs.length
  })

  return NextResponse.json({ ok: true, version, revision_id: revision!.id })
}
