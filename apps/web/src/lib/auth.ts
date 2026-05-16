import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import type { SessionUser, UserRole } from './auth-types'
export type { SessionUser, UserRole }
export { ROLE_LABELS, ROLE_COLORS, requireRole } from './auth-types'

if (process.env.NODE_ENV === 'production' &&
    (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === 'dev-secret-change-in-production')) {
  console.warn('[auth] WARNING: NEXTAUTH_SECRET is not set or is using the default value!')
}

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production'
)

// Session duration: 8 hours active session, not 7 days.
// A stolen token from a short session is far less dangerous.
// Users on an active medical device project expect to re-login daily — this is appropriate.
const SESSION_DURATION_SECONDS = 8 * 60 * 60 // 8 hours
const SESSION_DURATION_JWT = '8h'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(SESSION_DURATION_JWT)
    .setIssuedAt()
    // jti (JWT ID) makes every token unique — prevents token reuse after logout
    // if you add a token blocklist later
    .setJti(crypto.randomUUID())
    .sign(SECRET)
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = cookies().get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  try {
    const token = req.cookies.get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

// Call this when setting the session cookie — centralises all cookie flags
// so they can't drift between routes
export function sessionCookieOptions() {
  return {
    httpOnly: true,                                       // JS cannot read this cookie
    secure: process.env.NODE_ENV === 'production',        // HTTPS only in prod
    sameSite: 'lax' as const,                            // CSRF protection
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  }
}
