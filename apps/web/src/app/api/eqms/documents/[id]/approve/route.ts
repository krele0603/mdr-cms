import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'client-MR'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const doc = await queryOne(
    `SELECT id, current_version_id FROM eqms_documents WHERE id = $1::uuid`,
    [params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Archive all currently active versions
  await query(
    `UPDATE eqms_document_versions
     SET status = 'archived'
     WHERE document_id = $1::uuid AND status = 'active'`,
    [params.id]
  )

  // Approve the pending version
  await query(
    `UPDATE eqms_document_versions
     SET status = 'active', approved_by = $1::uuid, approved_at = now()
     WHERE id = $2::uuid`,
    [session.id, doc.current_version_id]
  )

  // Update document status
  await query(
    `UPDATE eqms_documents SET status = 'active', updated_at = now() WHERE id = $1::uuid`,
    [params.id]
  )

  // Mark approval request as approved
  await query(
    `UPDATE eqms_approvals
     SET status = 'approved', reviewed_by = $1::uuid, reviewed_at = now()
     WHERE entity_id = $2::uuid AND status = 'pending'`,
    [session.id, params.id]
  )

  return NextResponse.json({ ok: true })
}
