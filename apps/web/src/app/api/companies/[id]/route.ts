import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Non-admin must be a member of the company
  if (session.role !== 'admin') {
    const member = await queryOne(
      `SELECT id FROM company_members WHERE company_id=$1::uuid AND user_id=$2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const company = await queryOne(
    `SELECT id, name, country, contact, email, created_at FROM companies WHERE id=$1::uuid`,
    [params.id]
  )
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await query(
    `SELECT u.id, u.name, u.email, u.role, cm.added_at
     FROM company_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.company_id = $1::uuid
     ORDER BY u.name ASC`,
    [params.id]
  )

  // Load project assignments for each member
  const memberProjectAssignments = await query(
    `SELECT pm.user_id, pm.project_id, pm.access_level, p.name AS project_name
     FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     WHERE p.company_id = $1::uuid AND pm.role = 'client'`,
    [params.id]
  )

  const projects = await query(
    `SELECT p.id, p.name, p.device_name, p.status, p.updated_at,
            dl.name AS list_name,
            COUNT(DISTINCT pd.id) AS total_docs,
            COUNT(DISTINCT CASE WHEN pd.status='approved' THEN pd.id END) AS approved_docs
     FROM projects p
     LEFT JOIN document_lists dl ON dl.id = p.list_id
     LEFT JOIN project_documents pd ON pd.project_id = p.id
     WHERE p.company_id = $1::uuid
     GROUP BY p.id, dl.name
     ORDER BY p.updated_at DESC`,
    [params.id]
  )

  // Attach project assignments to members
  const membersWithProjects = members.map((m: any) => ({
    ...m,
    project_assignments: memberProjectAssignments.filter((a: any) => a.user_id === m.id)
  }))

  return NextResponse.json({ company, members: membersWithProjects, projects })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, country, contact, email } = await req.json()
  const company = await queryOne(
    `UPDATE companies SET
       name    = COALESCE($1, name),
       country = COALESCE($2, country),
       contact = COALESCE($3, contact),
       email   = COALESCE($4, email)
     WHERE id = $5::uuid RETURNING id, name, country, contact, email`,
    [name || null, country || null, contact || null, email || null, params.id]
  )
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(company)
}
