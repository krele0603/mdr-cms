import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query, auditLog } from '@/lib/db'
import { verifyPassword, createSession, sessionCookieOptions } from '@/lib/auth'

// In-process rate limiter — nginx handles the real rate limiting, but this is
// a second layer that works even if nginx config changes.
// Uses a sliding window per IP address.
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 10           // max attempts per IP per window

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count }
}

// Clean up stale entries periodically (every 100 requests)
let cleanupCounter = 0
function maybeCleanup() {
  if (++cleanupCounter % 100 !== 0) return
  const now = Date.now()
  Array.from(loginAttempts.keys()).forEach(ip => {
    const entry = loginAttempts.get(ip)!
    if (now > entry.resetAt) loginAttempts.delete(ip)
  })
}

export async function POST(req: NextRequest) {
  // Extract real IP (Cloudflare sets CF-Connecting-IP; fallback to X-Real-IP set by nginx)
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'

  maybeCleanup()
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      {
        status: 429,
        headers: { 'Retry-After': '900' },
      }
    )
  }

  try {
    let body: { email?: unknown; password?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email, password } = body

    // Validate types — don't trust the client
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (!email.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    // Basic length guards to prevent absurdly large inputs reaching bcrypt
    if (email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
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

    // Always run bcrypt even when user not found — prevents user enumeration via timing
    const dummyHash = '$2b$12$invalidhashfortimingprotectiononly000000000000000000000'
    const hashToCheck = user?.password_hash ?? dummyHash
    const valid = await verifyPassword(password, hashToCheck)

    if (!user || !valid) {
      // Audit failed login attempts
      await auditLog(null, 'auth', email.toLowerCase().trim(), 'login_failed', { ip })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Fetch company memberships
    const memberships = await query(
      `SELECT c.id, c.name, cm.role AS company_role FROM company_members cm
       JOIN companies c ON c.id = cm.company_id
       WHERE cm.user_id = $1::uuid
       ORDER BY cm.added_at ASC`,
      [user.id]
    )
    const company_ids = memberships.map((m: any) => m.id)
    const company_id = company_ids[0] || null
    const company_name = memberships[0]?.name || null

    let effectiveRole = user.role
    if (!['admin', 'consultant'].includes(user.role) && memberships.length > 0) {
      effectiveRole = memberships[0].company_role || user.role
    }

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole as any,
      company_id,
      company_name,
      company_ids,
    })

    await auditLog(user.id, 'auth', user.id, 'login_success', { ip, role: effectiveRole })

    const response = NextResponse.json({ ok: true, role: effectiveRole })
    response.cookies.set('session', token, sessionCookieOptions())
    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
