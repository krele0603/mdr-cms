import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all conversations for this user
  // A conversation = unique (project_id, other_user_id) pair
  const conversations = await query(`
    SELECT DISTINCT ON (project_id, other_id)
      project_id,
      other_id,
      other_name,
      other_role,
      project_name,
      last_content,
      last_at,
      unread_count
    FROM (
      SELECT
        m.project_id,
        CASE WHEN m.sender_id = $1::uuid THEN m.recipient_id ELSE m.sender_id END AS other_id,
        CASE WHEN m.sender_id = $1::uuid THEN ru.name ELSE su.name END AS other_name,
        CASE WHEN m.sender_id = $1::uuid THEN ru.role ELSE su.role END AS other_role,
        p.name AS project_name,
        LAST_VALUE(m.content) OVER (
          PARTITION BY m.project_id,
            CASE WHEN m.sender_id = $1::uuid THEN m.recipient_id ELSE m.sender_id END
          ORDER BY m.created_at
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS last_content,
        MAX(m.created_at) OVER (
          PARTITION BY m.project_id,
            CASE WHEN m.sender_id = $1::uuid THEN m.recipient_id ELSE m.sender_id END
        ) AS last_at,
        COUNT(CASE WHEN m.recipient_id = $1::uuid AND m.read = FALSE THEN 1 END) OVER (
          PARTITION BY m.project_id,
            CASE WHEN m.sender_id = $1::uuid THEN m.recipient_id ELSE m.sender_id END
        ) AS unread_count
      FROM messages m
      JOIN projects p ON p.id = m.project_id
      JOIN users su ON su.id = m.sender_id
      JOIN users ru ON ru.id = m.recipient_id
      WHERE m.sender_id = $1::uuid OR m.recipient_id = $1::uuid
    ) conv
    ORDER BY project_id, other_id, last_at DESC
  `, [session.id])

  const unreadTotal = conversations.reduce((sum: number, c: any) => sum + Number(c.unread_count || 0), 0)

  return NextResponse.json({ conversations, unreadTotal })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, recipient_id, content } = body

  if (!project_id || !recipient_id || !content?.trim()) {
    return NextResponse.json({ error: 'project_id, recipient_id and content are required' }, { status: 400 })
  }

  // Verify both users are members of the project
  const senderMember = await queryOne(
    `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid
     UNION SELECT id FROM projects WHERE id = $1::uuid AND created_by = $2::uuid`,
    [project_id, session.id]
  )
  if (!senderMember && session.role !== 'admin') {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 })
  }

  const message = await queryOne(`
    INSERT INTO messages (project_id, sender_id, recipient_id, content)
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
    RETURNING id, project_id, sender_id, recipient_id, content, read, created_at
  `, [project_id, session.id, recipient_id, content.trim()])

  return NextResponse.json(message, { status: 201 })
}
