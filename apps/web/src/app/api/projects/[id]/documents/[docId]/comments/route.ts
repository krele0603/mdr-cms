import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const comments = await query(`
    SELECT
      c.id, c.parent_id, c.content, c.anchor_text, c.anchor_id, c.resolved,
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
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { content, parent_id, anchor_text, anchor_id } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const doc = await queryOne(
    `SELECT id, name FROM project_documents WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.docId, params.id]
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await queryOne(`
    INSERT INTO document_comments (document_id, author_id, content, parent_id, anchor_text, anchor_id)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
    RETURNING id, content, parent_id, anchor_text, anchor_id, resolved, created_at
  `, [params.docId, session.id, content.trim(), parent_id || null, anchor_text || null, anchor_id || null])

  // Parse @mentions
  const mentions = content.match(/@([A-Za-z]+(?:\s[A-Za-z]+)?)/g) || []
  if (mentions.length > 0) {
    const members = await query(`
      SELECT u.id, u.name FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1::uuid AND u.id != $2::uuid
    `, [params.id, session.id])

    for (const mention of mentions) {
      const mentionedName = mention.slice(1).toLowerCase()
      const matchedUser = (members as any[]).find((m: any) =>
        m.name.toLowerCase().includes(mentionedName) ||
        mentionedName.includes(m.name.toLowerCase().split(' ')[0])
      )
      if (matchedUser) {
        await query(`
          INSERT INTO notifications (user_id, project_id, document_id, comment_id, type, message)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'mention', $5)
        `, [
          matchedUser.id, params.id, params.docId, comment.id,
          `${session.name} mentioned you in "${doc.name}": "${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`
        ])
      }
    }
  }

  // Notify parent comment author on reply
  if (parent_id) {
    const parentComment = await queryOne(
      `SELECT author_id FROM document_comments WHERE id = $1::uuid`,
      [parent_id]
    )
    if (parentComment && parentComment.author_id !== session.id) {
      await query(`
        INSERT INTO notifications (user_id, project_id, document_id, comment_id, type, message)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'comment', $5)
      `, [
        parentComment.author_id, params.id, params.docId, comment.id,
        `${session.name} replied to your comment in "${doc.name}"`
      ])
    }
  }

  return NextResponse.json({
    ...comment,
    author_id: session.id,
    author_name: session.name,
    author_role: session.role,
  }, { status: 201 })
}
