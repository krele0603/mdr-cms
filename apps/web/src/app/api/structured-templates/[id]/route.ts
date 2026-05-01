import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await queryOne(
    `SELECT id, name, req_type, text_content, status, created_at, updated_at
     FROM structured_templates WHERE id = $1::uuid`,
    [params.id]
  )
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const questions = await query(
    `SELECT id, position, question_text FROM structured_template_questions
     WHERE template_id = $1::uuid ORDER BY position ASC`,
    [params.id]
  )

  return NextResponse.json({ template, questions })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, text_content, status, questions } = await req.json()

  if (name !== undefined || text_content !== undefined || status !== undefined) {
    await query(
      `UPDATE structured_templates SET
         name         = COALESCE($1, name),
         text_content = COALESCE($2, text_content),
         status       = COALESCE($3, status),
         updated_at   = now()
       WHERE id = $4::uuid`,
      [name || null, text_content ? JSON.stringify(text_content) : null, status || null, params.id]
    )
  }

  // Update questions if provided
  if (questions && Array.isArray(questions)) {
    await query(`DELETE FROM structured_template_questions WHERE template_id = $1::uuid`, [params.id])
    for (let i = 0; i < questions.length; i++) {
      await query(
        `INSERT INTO structured_template_questions (template_id, position, question_text)
         VALUES ($1::uuid, $2, $3)`,
        [params.id, i, questions[i]]
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await query(`DELETE FROM structured_templates WHERE id = $1::uuid`, [params.id])
  return NextResponse.json({ ok: true })
}
