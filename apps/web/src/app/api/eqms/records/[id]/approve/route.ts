import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'client-MR'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rec = await queryOne(
    `SELECT id, current_version_id FROM eqms_records WHERE id = $1::uuid`,
    [params.id]
  )
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await query(
    `UPDATE eqms_record_versions SET status = 'archived'
     WHERE record_id = $1::uuid AND status = 'active'`,
    [params.id]
  )

  await query(
    `UPDATE eqms_record_versions
     SET status = 'active', approved_by = $1::uuid, approved_at = now()
     WHERE id = $2::uuid`,
    [session.id, rec.current_version_id]
  )

  await query(
    `UPDATE eqms_records SET status = 'active', updated_at = now() WHERE id = $1::uuid`,
    [params.id]
  )

  await query(
    `UPDATE eqms_approvals
     SET status = 'approved', reviewed_by = $1::uuid, reviewed_at = now()
     WHERE entity_id = $2::uuid AND status = 'pending'`,
    [session.id, params.id]
  )

  await auditLog(session.id, 'eqms_record', params.id, 'approved', {})
  return NextResponse.json({ ok: true })
}
