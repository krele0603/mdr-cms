import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let companies

  if (session.role === 'admin') {
    companies = await query(`
      SELECT c.id, c.name, c.country, c.contact, c.email, c.created_at,
             COUNT(DISTINCT cm.user_id) AS member_count,
             COUNT(DISTINCT p.id) AS project_count
      FROM companies c
      LEFT JOIN company_members cm ON cm.company_id = c.id
      LEFT JOIN projects p ON p.company_id = c.id
      GROUP BY c.id ORDER BY c.name ASC
    `)
  } else {
    // consultant, client, client-MR — see companies they're members of
    companies = await query(`
      SELECT c.id, c.name, c.country, c.contact, c.email, c.created_at,
             COUNT(DISTINCT cm2.user_id) AS member_count,
             COUNT(DISTINCT p.id) AS project_count
      FROM companies c
      JOIN company_members cm ON cm.company_id = c.id AND cm.user_id = $1::uuid
      LEFT JOIN company_members cm2 ON cm2.company_id = c.id
      LEFT JOIN projects p ON p.company_id = c.id
      GROUP BY c.id ORDER BY c.name ASC
    `, [session.id])
  }

  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { name, country, contact, email } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const existing = await queryOne(`SELECT id FROM companies WHERE name ILIKE $1`, [name.trim()])
  if (existing) return NextResponse.json({ error: 'Company already exists' }, { status: 409 })

  const company = await queryOne(
    `INSERT INTO companies (name, country, contact, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, country, contact, email, created_at`,
    [name.trim(), country?.trim() || null, contact?.trim() || null, email?.trim() || null]
  )
  return NextResponse.json(company, { status: 201 })
}
