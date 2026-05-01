import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const row = await queryOne(
    `SELECT text_content FROM project_req_documents
     WHERE project_id = $1::uuid AND req_type = $2`,
    [params.id, type]
  )
  return NextResponse.json(row || null)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, text_content } = await req.json()
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  await query(
    `INSERT INTO project_req_documents (project_id, req_type, text_content, updated_by)
     VALUES ($1::uuid, $2, $3, $4::uuid)
     ON CONFLICT (project_id, req_type)
     DO UPDATE SET text_content = $3, updated_by = $4::uuid, updated_at = now()`,
    [params.id, type, JSON.stringify(text_content), session.id]
  )
  return NextResponse.json({ ok: true })
}
