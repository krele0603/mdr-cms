import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Clients only see projects they're assigned to
  const projects = await query(`
    SELECT
      p.id,
      p.name,
      p.device_name,
      p.manufacturer_name,
      p.status,
      p.created_at,
      dl.name AS list_name,
      COUNT(pd.id)::int AS total_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'approved')::int AS approved_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'review')::int AS review_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'inprogress')::int AS inprogress_docs
    FROM projects p
    LEFT JOIN document_lists dl ON dl.id = p.list_id
    LEFT JOIN project_documents pd ON pd.project_id = p.id
    INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1::uuid
    GROUP BY p.id, p.name, p.device_name, p.manufacturer_name, p.status, p.created_at, dl.name
    ORDER BY p.created_at DESC
  `, [session.id])

  return NextResponse.json(projects)
}
