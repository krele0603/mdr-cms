import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, role, active, password } = body

  const user = await queryOne('SELECT id FROM users WHERE id = $1', [params.id])
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (name !== undefined) {
    await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name, params.id])
  }
  if (role !== undefined) {
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, params.id])
  }
  if (active !== undefined) {
    await query('UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2', [active, params.id])
  }
  if (password) {
    const hash = await hashPassword(password)
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, params.id])
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.id === session.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await query('UPDATE users SET active = false, updated_at = NOW() WHERE id = $1', [params.id])
  return NextResponse.json({ ok: true })
}
