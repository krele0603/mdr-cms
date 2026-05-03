import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Project filter per role
  const isAdmin = session.role === 'admin'
  const isConsultant = session.role === 'consultant'
  const isClient = session.role === 'client' || session.role === 'client-MR'

  const consultantFilter = `p.id IN (
    SELECT p2.id FROM projects p2
    JOIN company_members cm ON cm.company_id = p2.company_id AND cm.user_id = $1::uuid
  )`

  const clientFilter = `p.id IN (
    SELECT project_id FROM project_members WHERE user_id = $1::uuid
  )`

  const whereClause = isConsultant ? `WHERE ${consultantFilter}`
    : isClient ? `WHERE ${clientFilter}` : ''

  const params = !isAdmin ? [session.id] : []

  const stats = await queryOne(`
    SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active')::int     AS active_projects,
      COUNT(DISTINCT p.id)::int                                         AS total_projects,
      COUNT(DISTINCT t.id)::int                                         AS templates,
      COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'review')::int   AS pending_review,
      COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'approved')::int AS approved_docs,
      COUNT(DISTINCT pd.id)::int                                        AS total_docs
    FROM projects p
    LEFT JOIN project_documents pd ON pd.project_id = p.id
    LEFT JOIN templates t ON TRUE
    ${whereClause}
  `, params)

  const projects = await query(`
    SELECT
      p.id, p.name, p.device_name, p.status, p.created_at,
      COUNT(pd.id)::int                                            AS total_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'approved')::int     AS approved_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'review')::int       AS review_docs,
      COUNT(pd.id) FILTER (WHERE pd.status = 'inprogress')::int   AS inprogress_docs
    FROM projects p
    LEFT JOIN project_documents pd ON pd.project_id = p.id
    ${whereClause}
    GROUP BY p.id, p.name, p.device_name, p.status, p.created_at
    ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
    LIMIT 6
  `, params)

  const andClause = isConsultant ? `AND ${consultantFilter}`
    : isClient ? `AND ${clientFilter}` : ''

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
    ${andClause}
    ORDER BY pd.updated_at DESC
    LIMIT 8
  `, params)

  return NextResponse.json({ stats, projects, needsAttention })
}
