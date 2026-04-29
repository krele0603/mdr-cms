// /api/projects/[id]/traceability/[tmId]/revision-history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type P = { params: { id: string; tmId: string } }

export async function POST(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const row = await queryOne(
    `INSERT INTO traceability_revision_history (tm_id, revision, issue_date, description, author, position)
     VALUES ($1::uuid, $2, $3, $4, $5, (SELECT COALESCE(MAX(position),0)+1 FROM traceability_revision_history WHERE tm_id = $1::uuid))
     RETURNING *`,
    [params.tmId, body.revision || '', body.issue_date || null, body.description || '', body.author || '']
  )
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['revision', 'issue_date', 'description', 'author']
  if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  await query(`UPDATE traceability_revision_history SET ${body.field} = $1 WHERE id = $2::uuid AND tm_id = $3::uuid`, [body.value, body.id, params.tmId])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  await query(`DELETE FROM traceability_revision_history WHERE id = $1::uuid AND tm_id = $2::uuid`, [searchParams.get('rowId'), params.tmId])
  return NextResponse.json({ ok: true })
}
