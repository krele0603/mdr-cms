import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await query(
    `SELECT pm.id, pm.role, pm.joined_at,
            u.id AS user_id, u.name, u.email, u.role AS user_role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1::uuid
     ORDER BY pm.joined_at ASC`,
    [params.id]
  )

  return NextResponse.json(members)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { user_id, role } = body

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Check user exists
  const user = await queryOne(
    `SELECT id, name, email, role FROM users WHERE id = $1::uuid`,
    [user_id]
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check not already a member
  const existing = await queryOne(
    `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
    [params.id, user_id]
  )
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  const member = await queryOne(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1::uuid, $2::uuid, $3)
     RETURNING id, role, joined_at`,
    [params.id, user_id, role || 'editor']
  )

  return NextResponse.json({ ...member, user_id, name: user.name, email: user.email, user_role: user.role }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  await query(
    `DELETE FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
    [params.id, user_id]
  )

  return NextResponse.json({ ok: true })
}
