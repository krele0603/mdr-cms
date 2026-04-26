import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/messages/read?project_id=X&other_id=Y — get thread + mark as read
// POST /api/messages/read?project_id=X&other_id=Y — mark conversation read

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const otherId = searchParams.get('other_id')

  if (!projectId || !otherId) {
    return NextResponse.json({ error: 'project_id and other_id required' }, { status: 400 })
  }

  // Get all messages in this conversation
  const messages = await query(`
    SELECT m.id, m.content, m.read, m.created_at,
           m.sender_id, u.name AS sender_name, u.role AS sender_role
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.project_id = $1::uuid
      AND (
        (m.sender_id = $2::uuid AND m.recipient_id = $3::uuid)
        OR (m.sender_id = $3::uuid AND m.recipient_id = $2::uuid)
      )
    ORDER BY m.created_at ASC
  `, [projectId, session.id, otherId])

  // Mark unread messages as read
  await query(`
    UPDATE messages SET read = TRUE
    WHERE project_id = $1::uuid
      AND sender_id = $2::uuid
      AND recipient_id = $3::uuid
      AND read = FALSE
  `, [projectId, otherId, session.id])

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const otherId = searchParams.get('other_id')

  if (!projectId || !otherId) {
    return NextResponse.json({ error: 'project_id and other_id required' }, { status: 400 })
  }

  await query(`
    UPDATE messages SET read = TRUE
    WHERE project_id = $1::uuid AND sender_id = $2::uuid AND recipient_id = $3::uuid AND read = FALSE
  `, [projectId, otherId, session.id])

  return NextResponse.json({ ok: true })
}
