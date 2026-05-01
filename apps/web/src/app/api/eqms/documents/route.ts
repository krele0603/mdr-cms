import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder_id = req.nextUrl.searchParams.get('folder_id')
  const company_id = req.nextUrl.searchParams.get('company_id')
  if (!folder_id) return NextResponse.json({ error: 'folder_id required' }, { status: 400 })

  // Verify access: admin sees all, others must be member of the company
  if (session.role !== 'admin' && company_id) {
    const membership = await queryOne(
      `SELECT id FROM company_members WHERE company_id = $1::uuid AND user_id = $2::uuid`,
      [company_id, session.id]
    )
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = company_id
    ? await query(
        `SELECT d.id, d.level, d.folder_id, d.code, d.title, d.status,
                d.created_at, d.updated_at, u.name AS created_by_name,
                v.version_major, v.version_minor, v.status AS version_status,
                v.id AS current_version_id
         FROM eqms_documents d
         LEFT JOIN users u ON u.id = d.created_by
         LEFT JOIN eqms_document_versions v ON v.id = d.current_version_id
         WHERE d.folder_id = $1::uuid AND d.company_id = $2::uuid
         ORDER BY d.title ASC`,
        [folder_id, company_id]
      )
    : await query(
        `SELECT d.id, d.level, d.folder_id, d.code, d.title, d.status,
                d.created_at, d.updated_at, u.name AS created_by_name,
                v.version_major, v.version_minor, v.status AS version_status,
                v.id AS current_version_id
         FROM eqms_documents d
         LEFT JOIN users u ON u.id = d.created_by
         LEFT JOIN eqms_document_versions v ON v.id = d.current_version_id
         WHERE d.folder_id = $1::uuid
         ORDER BY d.title ASC`,
        [folder_id]
      )

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { folder_id, level, title, code, company_id } = await req.json()
  if (!folder_id || !level || !title?.trim())
    return NextResponse.json({ error: 'folder_id, level and title are required' }, { status: 400 })

  const doc = await queryOne(
    `INSERT INTO eqms_documents (level, folder_id, code, title, status, company_id, created_by)
     VALUES ($1::int, $2::uuid, $3, $4, 'draft', $5::uuid, $6::uuid)
     RETURNING id, level, folder_id, code, title, status`,
    [level, folder_id, code?.trim() || null, title.trim(), company_id || null, session.id]
  )

  const version = await queryOne(
    `INSERT INTO eqms_document_versions
       (document_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, 1, 0, '{"type":"doc","content":[{"type":"paragraph"}]}', 'draft', $2::uuid)
     RETURNING id`,
    [doc.id, session.id]
  )

  await query(
    `UPDATE eqms_documents SET current_version_id = $1::uuid WHERE id = $2::uuid`,
    [version.id, doc.id]
  )

  return NextResponse.json({ ...doc, current_version_id: version.id }, { status: 201 })
}
