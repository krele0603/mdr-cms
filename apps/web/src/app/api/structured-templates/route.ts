import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const req_type = req.nextUrl.searchParams.get('req_type')
  const rows = await query(
    `SELECT id, name, req_type, status, created_at
     FROM structured_templates
     ${req_type ? 'WHERE req_type = $1' : ''}
     ORDER BY name ASC`,
    req_type ? [req_type] : []
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, req_type } = await req.json()
  if (!name?.trim() || !req_type)
    return NextResponse.json({ error: 'name and req_type required' }, { status: 400 })

  const template = await queryOne(
    `INSERT INTO structured_templates (name, req_type, text_content, status, created_by)
     VALUES ($1, $2, '{"type":"doc","content":[{"type":"paragraph"}]}', 'draft', $3::uuid)
     RETURNING id, name, req_type, status`,
    [name.trim(), req_type, session.id]
  )

  // Seed default IEC 62304 questions
  const defaultQuestions = [
    'Do not contradict one another',
    'Are expressed in terms that avoid ambiguity',
    'Are stated in terms that permit the establishment of test criteria and performance of tests to determine whether the test criteria have been met',
    'Can be uniquely identified',
  ]
  for (let i = 0; i < defaultQuestions.length; i++) {
    await queryOne(
      `INSERT INTO structured_template_questions (template_id, position, question_text)
       VALUES ($1::uuid, $2, $3)`,
      [template.id, i, defaultQuestions[i]]
    )
  }

  return NextResponse.json(template, { status: 201 })
}
