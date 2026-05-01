import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await queryOne<{
      id: string; email: string; name: string; role: string
      password_hash: string
    }>(
      `SELECT id, email, name, role, password_hash
       FROM users
       WHERE email = $1 AND active = true`,
      [email.toLowerCase().trim()]
    )

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Fetch all company memberships
    const memberships = await query(
      `SELECT c.id, c.name FROM company_members cm
       JOIN companies c ON c.id = cm.company_id
       WHERE cm.user_id = $1::uuid
       ORDER BY cm.added_at ASC`,
      [user.id]
    )

    const company_ids = memberships.map((m: any) => m.id)
    const company_id = company_ids[0] || null
    const company_name = memberships[0]?.name || null

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      company_id,
      company_name,
      company_ids,
    })

    const response = NextResponse.json({ ok: true, role: user.role })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
