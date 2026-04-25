import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify access
  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const comments = await query(`
    SELECT
      c.id, c.parent_id, c.content, c.resolved,
      c.resolved_at, c.created_at, c.updated_at,
      u.id AS author_id, u.name AS author_name, u.role AS author_role,
      ru.name AS resolved_by_name
    FROM document_comments c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN users ru ON ru.id = c.resolved_by
    WHERE c.document_id = $1::uuid
    ORDER BY c.created_at ASC
  `, [params.docId])

  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify access
  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { content, parent_id } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  // Verify document belongs to project
  const doc = await queryOne(
    `SELECT id FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.docId, params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await queryOne(`
    INSERT INTO document_comments (document_id, author_id, content, parent_id)
    VALUES ($1::uuid, $2::uuid, $3, $4)
    RETURNING id, content, parent_id, resolved, created_at
  `, [params.docId, session.id, content.trim(), parent_id || null])

  return NextResponse.json({
    ...comment,
    author_id: session.id,
    author_name: session.name,
    author_role: session.role,
  }, { status: 201 })
}
