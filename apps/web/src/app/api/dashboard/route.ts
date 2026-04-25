import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Stats
  const stats = await queryOne(`
    SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active')::int        AS active_projects,
      COUNT(DISTINCT p.id)::int                                            AS total_projects,
      COUNT(DISTINCT t.id)::int                                            AS templates,
      COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'review')::int      AS pending_review,
      COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'approved')::int    AS approved_docs,
      COUNT(DISTINCT pd.id)::int                                           AS total_docs
    FROM projects p
    LEFT JOIN project_documents pd ON pd.project_id = p.id
    LEFT JOIN templates t ON TRUE
    ${session.role === 'consultant' ? `WHERE p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
      UNION SELECT id FROM projects WHERE created_by = $1::uuid
    )` : session.role === 'client' ? `WHERE p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
    )` : ''}
  `, session.role !== 'admin' ? [session.id] : [])

  // Projects with progress
  const projects = await query(`
    SELECT
      p.id, p.name, p.device_name, p.status, p.created_at,
      COUNT(pd.id)::int                                             AS total_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'approved')::int      AS approved_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'review')::int        AS review_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'inprogress')::int    AS inprogress_docs
    FROM projects p
    LEFT JOIN project_documents pd ON pd.project_id = p.id
    ${session.role === 'consultant' ? `WHERE p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
      UNION SELECT id FROM projects WHERE created_by = $1::uuid
    )` : session.role === 'client' ? `WHERE p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
    )` : ''}
    GROUP BY p.id, p.name, p.device_name, p.status, p.created_at
    ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
    LIMIT 6
  `, session.role !== 'admin' ? [session.id] : [])

  // Records needing attention (in review)
  const needsAttention = await query(`
    SELECT
      pd.id, pd.name, pd.annex, pd.status, pd.updated_at,
      p.id   AS project_id,
      p.name AS project_name,
      u.name AS updated_by_name
    FROM project_documents pd
    JOIN projects p ON p.id = pd.project_id
    LEFT JOIN users u ON u.id = pd.approved_by
    WHERE pd.status = 'review'
    ${session.role === 'consultant' ? `AND p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
      UNION SELECT id FROM projects WHERE created_by = $1::uuid
    )` : session.role === 'client' ? `AND p.id IN (
      SELECT project_id FROM project_members WHERE user_id = $1::uuid
    )` : ''}
    ORDER BY pd.updated_at DESC
    LIMIT 8
  `, session.role !== 'admin' ? [session.id] : [])

  return NextResponse.json({ stats, projects, needsAttention })
}
