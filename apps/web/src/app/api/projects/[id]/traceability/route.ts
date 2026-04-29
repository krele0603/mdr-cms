// /api/projects/[id]/traceability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tm = await queryOne(
    `SELECT * FROM traceability_documents WHERE project_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
    [params.id]
  )
  if (!tm) return NextResponse.json({ tm: null })

  const [revisions, reqLists, fmeaSheets] = await Promise.all([
    query(`SELECT * FROM traceability_revision_history WHERE tm_id = $1::uuid ORDER BY position`, [tm.id]),
    query(`SELECT * FROM req_lists WHERE project_id = $1::uuid ORDER BY type DESC, position`, [params.id]),
    query(`SELECT fs.*, fd.id as fmea_doc_id FROM fmea_sheets fs JOIN fmea_documents fd ON fd.id = fs.fmea_id WHERE fd.project_id = $1::uuid ORDER BY fs.position`, [params.id]),
  ])

  // Load full req data for each list
  const listsWithData = await Promise.all(reqLists.map(async (list: any) => {
    const groups = await query(`SELECT * FROM req_groups WHERE list_id = $1::uuid ORDER BY position`, [list.id])
    const groupsWithReqs = await Promise.all(groups.map(async (g: any) => {
      const reqs = await query(
        `SELECT r.*, pr.req_id AS parent_req_code FROM requirements r LEFT JOIN requirements pr ON pr.id = r.parent_req_id WHERE r.group_id = $1::uuid ORDER BY r.position`,
        [g.id]
      )
      return { ...g, reqs }
    }))
    // Load verification entries and extra cols for this list
    const [verEntries, extraCols] = await Promise.all([
      query(`SELECT * FROM verification_entries WHERE tm_id = $1::uuid AND list_id = $2::uuid ORDER BY position`, [tm.id, list.id]),
      query(`SELECT * FROM verification_extra_cols WHERE tm_id = $1::uuid AND list_id = $2::uuid ORDER BY position`, [tm.id, list.id]),
    ])
    return { ...list, groups: groupsWithReqs, verEntries, extraCols }
  }))

  // Load all FMEA rows for risk-req matrix
  const fmeaRows = await Promise.all(fmeaSheets.map(async (sheet: any) => {
    const rows = await query(
      `SELECT id, sheet_id, mitigation_req_ids FROM fmea_rows WHERE sheet_id = $1::uuid AND array_length(mitigation_req_ids, 1) > 0`,
      [sheet.id]
    )
    return { ...sheet, rows }
  }))

  return NextResponse.json({ tm, revisions, lists: listsWithData, fmeaSheets: fmeaRows })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await queryOne(`SELECT id FROM traceability_documents WHERE project_id = $1::uuid`, [params.id])
  if (existing) return NextResponse.json({ error: 'Traceability matrix already exists' }, { status: 409 })

  const project = await queryOne(`SELECT name, device_name FROM projects WHERE id = $1::uuid`, [params.id])

  const tm = await queryOne(
    `INSERT INTO traceability_documents (project_id, title, record_id, revision, doc_date, prepared_by, approved_by)
     VALUES ($1::uuid, $2, $3, '1.0', CURRENT_DATE, $4, '') RETURNING *`,
    [params.id, 'Traceability Matrix', '', session.name]
  )

  // Seed first revision history row
  await query(
    `INSERT INTO traceability_revision_history (tm_id, revision, issue_date, description, author, position)
     VALUES ($1::uuid, '1.0', CURRENT_DATE, $2, $3, 0)`,
    [tm.id, `Initial revision of traceability matrix for ${project?.device_name || ''}`, session.name]
  )

  // Auto-seed verification entries from existing requirements
  const reqLists = await query(`SELECT * FROM req_lists WHERE project_id = $1::uuid`, [params.id])
  for (const list of reqLists) {
    const reqs = await query(
      `SELECT r.req_id, r.position FROM requirements r JOIN req_groups g ON g.id = r.group_id WHERE g.list_id = $1::uuid ORDER BY r.position`,
      [list.id]
    )
    for (const r of reqs) {
      if (!r.req_id) continue
      await query(
        `INSERT INTO verification_entries (tm_id, list_id, req_id, position) VALUES ($1::uuid, $2::uuid, $3, $4) ON CONFLICT DO NOTHING`,
        [tm.id, list.id, r.req_id, r.position]
      )
    }
  }

  return NextResponse.json(tm, { status: 201 })
}
