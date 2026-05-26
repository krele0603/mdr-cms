import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { auditLog } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await queryOne(
    `SELECT d.id, d.level, d.folder_id, d.code, d.title, d.status AS status,
            d.company_id, d.created_at, d.updated_at,
            d.current_version_id,
            v.version_major, v.version_minor, v.content,
            v.status AS version_status,
            v.change_note,
            v.approved_by, v.approved_at,
            u.name AS created_by_name
     FROM eqms_documents d
     LEFT JOIN eqms_document_versions v ON v.id = d.current_version_id
     LEFT JOIN users u ON u.id = d.created_by
     WHERE d.id = $1::uuid`,
    [params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const versions = await query(
    `SELECT v.id, v.version_major, v.version_minor, v.status, v.change_note,
            v.created_at, v.approved_at,
            ub.name AS created_by_name, ua.name AS approved_by_name
     FROM eqms_document_versions v
     LEFT JOIN users ub ON ub.id = v.created_by
     LEFT JOIN users ua ON ua.id = v.approved_by
     WHERE v.document_id = $1::uuid
     ORDER BY v.version_major DESC, v.version_minor DESC`,
    [params.id]
  )

  return NextResponse.json({ doc, versions })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, code, content, change_note, folder_id } = await req.json()

  if (folder_id !== undefined) {
    await query(
      `UPDATE eqms_documents SET folder_id = $1::uuid, updated_at = now() WHERE id = $2::uuid`,
      [folder_id, params.id]
    )
    await auditLog(session.id, 'eqms_document', params.id, 'moved_to_folder', { folder_id })
    return NextResponse.json({ ok: true })
  }

  if (title !== undefined || code !== undefined) {
    await query(
      `UPDATE eqms_documents SET
         title = COALESCE($1, title),
         code  = COALESCE($2, code),
         updated_at = now()
       WHERE id = $3::uuid`,
      [title || null, code || null, params.id]
    )
  }

  if (content !== undefined) {
    await query(
      `UPDATE eqms_document_versions SET content = $1
       WHERE id = (SELECT current_version_id FROM eqms_documents WHERE id = $2::uuid)
         AND status = 'draft'`,
      [JSON.stringify(content), params.id]
    )
    await query(
      `UPDATE eqms_documents SET updated_at = now() WHERE id = $1::uuid`,
      [params.id]
    )
  }

  if (change_note !== undefined) {
    await query(
      `UPDATE eqms_document_versions SET change_note = $1
       WHERE id = (SELECT current_version_id FROM eqms_documents WHERE id = $2::uuid)`,
      [change_note, params.id]
    )
  }

  await auditLog(session.id, 'eqms_document', params.id, 'content_saved', {})
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await query(`DELETE FROM eqms_documents WHERE id = $1::uuid`, [params.id])
  return NextResponse.json({ ok: true })
}
