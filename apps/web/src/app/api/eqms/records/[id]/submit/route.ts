import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { change_note } = await req.json()

  await query(
    `UPDATE eqms_record_versions
     SET status = 'pending', change_note = COALESCE($1, change_note)
     WHERE id = (SELECT current_version_id FROM eqms_records WHERE id = $2::uuid)
       AND status = 'draft'`,
    [change_note || null, params.id]
  )

  const rec = await queryOne(
    `SELECT current_version_id FROM eqms_records WHERE id = $1::uuid`,
    [params.id]
  )
  if (rec) {
    await query(
      `INSERT INTO eqms_approvals (entity_type, entity_id, version_id, requested_by, status)
       VALUES ('record', $1::uuid, $2::uuid, $3::uuid, 'pending')
`,
      [params.id, rec.current_version_id, session.id]
    )
  }

  await auditLog(session.id, 'eqms_record', params.id, 'submitted', {})
  return NextResponse.json({ ok: true })
}
