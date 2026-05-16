import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folder_id  = req.nextUrl.searchParams.get('folder_id')
  const company_id = req.nextUrl.searchParams.get('company_id')

  if (!folder_id) return NextResponse.json({ error: 'folder_id required' }, { status: 400 })

  // Non-admin must be member of company
  if (session.role !== 'admin' && company_id) {
    const membership = await queryOne(
      `SELECT id FROM company_members WHERE company_id = $1::uuid AND user_id = $2::uuid`,
      [company_id, session.id]
    )
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const records = await query(
    `SELECT
       r.id, r.folder_id, r.code, r.title, r.status,
       r.created_at, r.updated_at,
       u.name AS created_by_name,
       t.title AS template_title, t.code AS template_code,
       rv.id AS current_version_id,
       rv.version_major, rv.version_minor, rv.status AS version_status
     FROM eqms_records r
     LEFT JOIN users u ON u.id = r.created_by
     LEFT JOIN eqms_documents t ON t.id = r.template_id
     LEFT JOIN eqms_record_versions rv ON rv.id = r.current_version_id
     WHERE r.folder_id = $1::uuid
       ${company_id ? 'AND r.company_id = $2::uuid' : ''}
     ORDER BY r.title ASC`,
    company_id ? [folder_id, company_id] : [folder_id]
  )

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { folder_id, template_id, title, code, company_id } = await req.json()

  if (!folder_id || !template_id || !title?.trim()) {
    return NextResponse.json({ error: 'folder_id, template_id and title required' }, { status: 400 })
  }

  // Verify template exists and is active
  const template = await queryOne(
    `SELECT id, title, current_version_id FROM eqms_documents
     WHERE id = $1::uuid AND status = 'active'`,
    [template_id]
  )
  if (!template) {
    return NextResponse.json({ error: 'Template not found or not active' }, { status: 404 })
  }

  // Get template content from its active version
  let initialContent = '{"type":"doc","content":[{"type":"paragraph"}]}'
  if (template.current_version_id) {
    const tv = await queryOne(
      `SELECT content FROM eqms_document_versions
       WHERE id = $1::uuid AND status = 'active'`,
      [template.current_version_id]
    )
    if (tv?.content) {
      initialContent = typeof tv.content === 'string' ? tv.content : JSON.stringify(tv.content)
    }
  }

  // Create record
  const record = await queryOne(
    `INSERT INTO eqms_records (folder_id, template_id, code, title, status, company_id, created_by)
     VALUES ($1::uuid, $2::uuid, $3, $4, 'draft', $5::uuid, $6::uuid)
     RETURNING id, folder_id, code, title, status`,
    [folder_id, template_id, code?.trim() || null, title.trim(), company_id || null, session.id]
  )

  // Create initial version
  const version = await queryOne(
    `INSERT INTO eqms_record_versions
       (record_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, 1, 0, $2, 'draft', $3::uuid)
     RETURNING id`,
    [record.id, initialContent, session.id]
  )

  // Link version to record
  await query(
    `UPDATE eqms_records SET current_version_id = $1::uuid WHERE id = $2::uuid`,
    [version.id, record.id]
  )

  return NextResponse.json({ ...record, current_version_id: version.id }, { status: 201 })
}
