import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { auditLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant', 'client-MR'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Get current approved version
  const doc = await queryOne(
    `SELECT d.id, d.current_version_id, v.version_major, v.version_minor, v.content
     FROM eqms_documents d
     JOIN eqms_document_versions v ON v.id = d.current_version_id
     WHERE d.id = $1::uuid AND v.status = 'active'`,
    [params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Document must be approved before creating a new revision' }, { status: 400 })

  // Create new draft version
  const newVersion = await queryOne(
    `INSERT INTO eqms_document_versions (document_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, $2, 0, $3, 'draft', $4::uuid)
     RETURNING id`,
    [params.id, doc.version_major + 1, JSON.stringify(doc.content), session.id]
  )
  if (!newVersion) return NextResponse.json({ error: 'Failed to create revision' }, { status: 500 })

  // Update document to point to new version
  await query(
    `UPDATE eqms_documents SET current_version_id = $1::uuid, status = 'draft', updated_at = NOW() WHERE id = $2::uuid`,
    [newVersion.id, params.id]
  )
  await auditLog(session.id, 'eqms_document', params.id, 'revised', {})
  return NextResponse.json({ ok: true })
}
