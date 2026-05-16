import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant', 'client-MR'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const company_id = searchParams.get('company_id')
  const level      = searchParams.get('level')      // optional filter
  const status     = searchParams.get('status')      // optional: draft, active, archived, pending

  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  // Non-admin must be member of company
  if (session.role !== 'admin') {
    const membership = await queryOne(
      `SELECT id FROM company_members WHERE company_id = $1::uuid AND user_id = $2::uuid`,
      [company_id, session.id]
    )
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const conditions: string[] = ['d.company_id = $1::uuid', 'd.level BETWEEN 1 AND 4']
  const vals: any[] = [company_id]
  let i = 2

  if (level)  { conditions.push(`d.level = $${i++}::int`);  vals.push(parseInt(level)) }
  if (status) { conditions.push(`v.status = $${i++}`);      vals.push(status) }

  const docs = await query(
    `SELECT
       d.id, d.level, d.code, d.title, d.status AS doc_status,
       d.created_at, d.updated_at,
       f.name AS folder_name,
       v.version_major, v.version_minor, v.status AS version_status,
       v.approved_at, v.change_note,
       uc.name AS created_by_name,
       ua.name AS approved_by_name
     FROM eqms_documents d
     LEFT JOIN eqms_folders f ON f.id = d.folder_id
     LEFT JOIN eqms_document_versions v ON v.id = d.current_version_id
     LEFT JOIN users uc ON uc.id = d.created_by
     LEFT JOIN users ua ON ua.id = v.approved_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.level ASC, f.name ASC, d.title ASC`,
    vals
  )

  // Level 5 records
  const recConditions: string[] = ['r.company_id = $1::uuid']
  const recVals: any[] = [company_id]
  let j = 2

  if (level && parseInt(level) !== 5) {
    // if filtering for a specific level that isn't 5, return empty records
    return NextResponse.json({ documents: docs, records: [] })
  }
  if (status) { recConditions.push(`rv.status = $${j++}`); recVals.push(status) }

  const records = await query(
    `SELECT
       r.id, 5 AS level, r.code, r.title, r.status AS doc_status,
       r.created_at, r.updated_at,
       f.name AS folder_name,
       t.title AS template_title,
       rv.version_major, rv.version_minor, rv.status AS version_status,
       rv.approved_at, rv.change_note,
       uc.name AS created_by_name,
       ua.name AS approved_by_name
     FROM eqms_records r
     LEFT JOIN eqms_folders f ON f.id = r.folder_id
     LEFT JOIN eqms_documents t ON t.id = r.template_id
     LEFT JOIN eqms_record_versions rv ON rv.id = r.current_version_id
     LEFT JOIN users uc ON uc.id = r.created_by
     LEFT JOIN users ua ON ua.id = rv.approved_by
     WHERE ${recConditions.join(' AND ')}
     ORDER BY f.name ASC, r.title ASC`,
    recVals
  )

  // Uploaded files (Level 5)
  const files = await query(
    `SELECT
       ef.id, 5 AS level, ef.original_name AS title, ef.file_size,
       ef.created_at, ef.created_at AS updated_at, ef.folder_id,
       f.name AS folder_name,
       u.name AS created_by_name,
       'file' AS item_type
     FROM eqms_files ef
     LEFT JOIN eqms_folders f ON f.id = ef.folder_id
     LEFT JOIN users u ON u.id = ef.uploaded_by
     WHERE ef.company_id = $1::uuid AND ef.record_id IS NULL
     ORDER BY f.name ASC, ef.original_name ASC`,
    [company_id]
  )

  return NextResponse.json({ documents: docs, records, files })
}
