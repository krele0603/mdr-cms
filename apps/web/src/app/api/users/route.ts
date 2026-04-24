import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await query<{
    id: string
    email: string
    name: string
    role: string
    active: boolean
    created_at: string
  }>(`
    SELECT id, email, name, role, active, created_at
    FROM users
    ORDER BY role, name
  `)

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, role, password } = await req.json()

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (!['admin', 'consultant', 'client'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hash = await hashPassword(password)
  const [user] = await query<{ id: string }>(`
    INSERT INTO users (email, name, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [email.toLowerCase().trim(), name.trim(), hash, role])

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 })
}
