import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await query(`
    SELECT
      n.id, n.type, n.message, n.read, n.created_at,
      n.project_id, n.document_id, n.comment_id,
      p.name AS project_name,
      pd.name AS document_name
    FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN project_documents pd ON pd.id = n.document_id
    WHERE n.user_id = $1::uuid
    ORDER BY n.created_at DESC
    LIMIT 50
  `, [session.id])

  const unreadCount = notifications.filter((n: any) => !n.read).length

  return NextResponse.json({ notifications, unreadCount })
}
