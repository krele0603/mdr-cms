import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant', 'client-MR'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rec = await queryOne(
    `SELECT r.id, r.current_version_id, v.version_major, v.version_minor, v.content
     FROM eqms_records r
     JOIN eqms_record_versions v ON v.id = r.current_version_id
     WHERE r.id = $1::uuid AND v.status = 'active'`,
    [params.id]
  )
  if (!rec) return NextResponse.json({ error: 'Record must be approved before creating a new revision' }, { status: 400 })

  const newVersion = await queryOne(
    `INSERT INTO eqms_record_versions (record_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, $2, 0, $3, 'draft', $4::uuid)
     RETURNING id`,
    [params.id, rec.version_major + 1, JSON.stringify(rec.content), session.id]
  )
  if (!newVersion) return NextResponse.json({ error: 'Failed to create revision' }, { status: 500 })

  await query(
    `UPDATE eqms_records SET current_version_id = $1::uuid, status = 'draft', updated_at = NOW() WHERE id = $2::uuid`,
    [newVersion.id, params.id]
  )

  await auditLog(session.id, 'eqms_record', params.id, 'revised', {})
  return NextResponse.json({ ok: true })
}
