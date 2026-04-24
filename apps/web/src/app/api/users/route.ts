import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  const users = await query(
    `SELECT id, email, name, role, created_at
     FROM users
     ${search ? `WHERE name ILIKE $1 OR email ILIKE $1` : ''}
     ORDER BY name ASC
     LIMIT 50`,
    search ? [`%${search}%`] : []
  )

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, role, password } = body

  if (!email?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Email, name and password are required' }, { status: 400 })
  }

  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()])
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const bcrypt = await import('bcryptjs')
  const password_hash = await bcrypt.hash(password, 12)

  const user = await queryOne(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at`,
    [email.toLowerCase().trim(), name.trim(), password_hash, role || 'client']
  )

  return NextResponse.json(user, { status: 201 })
}
