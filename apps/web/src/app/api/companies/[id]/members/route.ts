import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user_id, role } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  const memberRole = role || 'client'
  await queryOne(
    `INSERT INTO company_members (company_id, user_id, added_by, role)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
     ON CONFLICT (company_id, user_id) DO UPDATE SET role = $4`,
    [params.id, user_id, session.id, memberRole]
  )
  // Update user's global role to match
  await query(
    `UPDATE users SET company_id = $1::uuid, role = $2 WHERE id = $3::uuid`,
    [params.id, memberRole, user_id]
  )
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user_id, role } = await req.json()
  if (!user_id || !role) return NextResponse.json({ error: 'user_id and role required' }, { status: 400 })
  await query(
    `UPDATE company_members SET role = $1 WHERE company_id = $2::uuid AND user_id = $3::uuid`,
    [role, params.id, user_id]
  )
  // Update user's global role
  await query(`UPDATE users SET role = $1 WHERE id = $2::uuid`, [role, user_id])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  await query(`DELETE FROM company_members WHERE company_id=$1::uuid AND user_id=$2::uuid`, [params.id, user_id])
  return NextResponse.json({ ok: true })
}
