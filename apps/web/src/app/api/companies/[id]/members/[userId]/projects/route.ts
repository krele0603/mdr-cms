import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; userId: string } }

// POST — assign user to a project with access_level
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { project_id, access_level } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const level = access_level === 'edit' ? 'edit' : 'view'
  await queryOne(
    `INSERT INTO project_members (project_id, user_id, role, access_level)
     VALUES ($1::uuid, $2::uuid, 'client', $3)
     ON CONFLICT (project_id, user_id) DO UPDATE SET access_level = $3`,
    [project_id, params.userId, level]
  )
  return NextResponse.json({ ok: true })
}

// DELETE — remove user from a project
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const project_id = req.nextUrl.searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  await query(
    `DELETE FROM project_members WHERE project_id=$1::uuid AND user_id=$2::uuid`,
    [project_id, params.userId]
  )
  return NextResponse.json({ ok: true })
}

// PATCH — update access_level for existing assignment
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { project_id, access_level } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const level = access_level === 'edit' ? 'edit' : 'view'
  await query(
    `UPDATE project_members SET access_level=$1 WHERE project_id=$2::uuid AND user_id=$3::uuid`,
    [level, project_id, params.userId]
  )
  return NextResponse.json({ ok: true })
}
