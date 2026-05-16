import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rec = await queryOne(
    `SELECT r.id, r.folder_id, r.code, r.title, r.status,
            r.company_id, r.created_at, r.updated_at,
            r.current_version_id, r.template_id,
            t.title AS template_title, t.code AS template_code,
            v.version_major, v.version_minor, v.content,
            v.status AS version_status, v.change_note,
            v.approved_by, v.approved_at,
            u.name AS created_by_name
     FROM eqms_records r
     LEFT JOIN eqms_documents t ON t.id = r.template_id
     LEFT JOIN eqms_record_versions v ON v.id = r.current_version_id
     LEFT JOIN users u ON u.id = r.created_by
     WHERE r.id = $1::uuid`,
    [params.id]
  )
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const versions = await query(
    `SELECT v.id, v.version_major, v.version_minor, v.status, v.change_note,
            v.created_at, v.approved_at,
            ub.name AS created_by_name, ua.name AS approved_by_name
     FROM eqms_record_versions v
     LEFT JOIN users ub ON ub.id = v.created_by
     LEFT JOIN users ua ON ua.id = v.approved_by
     WHERE v.record_id = $1::uuid
     ORDER BY v.version_major DESC, v.version_minor DESC`,
    [params.id]
  )

  return NextResponse.json({ doc: { ...rec, level: 5 }, versions })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, code, content, change_note } = await req.json()

  if (title !== undefined || code !== undefined) {
    await query(
      `UPDATE eqms_records SET
         title = COALESCE($1, title),
         code  = COALESCE($2, code),
         updated_at = now()
       WHERE id = $3::uuid`,
      [title || null, code || null, params.id]
    )
  }

  if (content !== undefined) {
    await query(
      `UPDATE eqms_record_versions SET content = $1
       WHERE id = (SELECT current_version_id FROM eqms_records WHERE id = $2::uuid)
         AND status = 'draft'`,
      [JSON.stringify(content), params.id]
    )
    await query(
      `UPDATE eqms_records SET updated_at = now() WHERE id = $1::uuid`,
      [params.id]
    )
  }

  if (change_note !== undefined) {
    await query(
      `UPDATE eqms_record_versions SET change_note = $1
       WHERE id = (SELECT current_version_id FROM eqms_records WHERE id = $2::uuid)`,
      [change_note, params.id]
    )
  }

  await auditLog(session.id, 'eqms_record', params.id, 'content_saved', {})
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await query(`DELETE FROM eqms_records WHERE id = $1::uuid`, [params.id])
  return NextResponse.json({ ok: true })
}
