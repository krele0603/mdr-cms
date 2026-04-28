// /api/projects/[id]/fmea/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fmea = await queryOne(
    `SELECT * FROM fmea_documents WHERE project_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
    [params.id]
  )
  if (!fmea) return NextResponse.json({ fmea: null })

  const [revisions, rmTeam, criteria, sheets, annexAnswers, annexQuestions] = await Promise.all([
    query(`SELECT * FROM fmea_revision_history WHERE fmea_id = $1::uuid ORDER BY position`, [fmea.id]),
    query(`SELECT * FROM fmea_rm_team WHERE fmea_id = $1::uuid ORDER BY position`, [fmea.id]),
    queryOne(`SELECT * FROM fmea_criteria WHERE fmea_id = $1::uuid`, [fmea.id]),
    query(`SELECT * FROM fmea_sheets WHERE fmea_id = $1::uuid ORDER BY position`, [fmea.id]),
    query(`SELECT * FROM fmea_annex_a_answers WHERE fmea_id = $1::uuid`, [fmea.id]),
    query(`SELECT * FROM fmea_annex_a_questions ORDER BY position`, []),
  ])

  // Load rows for each sheet
  const sheetsWithRows = await Promise.all(
    sheets.map(async (sheet: any) => {
      const rows = await query(
        `SELECT * FROM fmea_rows WHERE sheet_id = $1::uuid ORDER BY position`,
        [sheet.id]
      )
      return { ...sheet, rows }
    })
  )

  return NextResponse.json({
    fmea,
    revisions,
    rmTeam,
    criteria,
    sheets: sheetsWithRows,
    annexAnswers,
    annexQuestions,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if already exists
  const existing = await queryOne(
    `SELECT id FROM fmea_documents WHERE project_id = $1::uuid`,
    [params.id]
  )
  if (existing) return NextResponse.json({ error: 'FMEA already exists for this project' }, { status: 409 })

  const body = await req.json()
  const project = await queryOne(`SELECT name, device_name FROM projects WHERE id = $1::uuid`, [params.id])

  const fmea = await queryOne(
    `INSERT INTO fmea_documents (project_id, title, record_id, form_code, revision, doc_date, prepared_by, approved_by)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      params.id,
      body.title || 'Risk Analysis',
      body.record_id || '',
      body.form_code || 'F7.70023',
      body.revision || '1.0',
      body.doc_date || new Date().toISOString().split('T')[0],
      body.prepared_by || session.name,
      body.approved_by || '',
    ]
  )

  // Seed default criteria
  await queryOne(
    `INSERT INTO fmea_criteria (fmea_id, r1_min, r1_max, r2_min, r2_max, r3_min, r3_max)
     VALUES ($1::uuid, 1, 4, 5, 12, 13, 25) RETURNING id`,
    [fmea.id]
  )

  // Seed first revision history row
  await query(
    `INSERT INTO fmea_revision_history (fmea_id, revision, issue_date, description, author, position)
     VALUES ($1::uuid, '1.0', CURRENT_DATE, $2, $3, 0)`,
    [fmea.id, `Initial revision of risk analysis for ${project?.device_name || ''}`, session.name]
  )

  // Seed empty annex A answers for all questions
  const questions = await query(`SELECT id FROM fmea_annex_a_questions ORDER BY position`, [])
  for (const q of questions) {
    await query(
      `INSERT INTO fmea_annex_a_answers (fmea_id, question_id, answer, input_to_ra, risk_ids)
       VALUES ($1::uuid, $2::uuid, '', '', '') ON CONFLICT DO NOTHING`,
      [fmea.id, q.id]
    )
  }

  return NextResponse.json(fmea, { status: 201 })
}
