import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { auditLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { change_note } = await req.json()

  // Mark current draft version as pending
  await query(
    `UPDATE eqms_document_versions
     SET status = 'pending', change_note = COALESCE($1, change_note)
     WHERE id = (SELECT current_version_id FROM eqms_documents WHERE id = $2::uuid)
       AND status = 'draft'`,
    [change_note || null, params.id]
  )

  // Create approval request
  const doc = await queryOne(
    `SELECT current_version_id FROM eqms_documents WHERE id = $1::uuid`,
    [params.id]
  )
  if (doc) {
    await query(
      `INSERT INTO eqms_approvals (entity_type, entity_id, version_id, requested_by, status)
       VALUES ('document', $1::uuid, $2::uuid, $3::uuid, 'pending')
`,
      [params.id, doc.current_version_id, session.id]
    )
  }

  await auditLog(session.id, 'eqms_document', params.id, 'submitted', {})
  return NextResponse.json({ ok: true })
}
