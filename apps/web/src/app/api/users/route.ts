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
  const company_id = searchParams.get('company_id')

  let whereClause = 'WHERE 1=1'
  const params: any[] = []

  if (search) {
    params.push(`%${search}%`)
    whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`
  }
  if (company_id) {
    params.push(company_id)
    whereClause += ` AND u.company_id = $${params.length}::uuid`
  }

  const users = await query(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.created_at,
            u.company_id, c.name as company_name
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     ${whereClause}
     ORDER BY u.name ASC
     LIMIT 50`,
    params
  )
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, name, role, password, company_id } = body

  if (!email?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Email, name and password are required' }, { status: 400 })
  }

  const existing = await queryOne(
    `SELECT id FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  )
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const bcrypt = await import('bcryptjs')
  const password_hash = await bcrypt.hash(password, 12)

  const companyIdVal = company_id && company_id.trim() ? company_id.trim() : null
  const user = await queryOne(
    companyIdVal
      ? `INSERT INTO users (email, name, password_hash, role, active, company_id)
         VALUES ($1, $2, $3, $4, TRUE, $5::uuid)
         RETURNING id, email, name, role, active, created_at, company_id`
      : `INSERT INTO users (email, name, password_hash, role, active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, email, name, role, active, created_at, company_id`,
    companyIdVal
      ? [email.toLowerCase().trim(), name.trim(), password_hash, role || 'client', companyIdVal]
      : [email.toLowerCase().trim(), name.trim(), password_hash, role || 'client']
  )
  return NextResponse.json(user, { status: 201 })
}
