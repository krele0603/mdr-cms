import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from './lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes — no auth needed
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Everything else requires a session
  const user = await getSessionFromRequest(req)
  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Client / client-MR roles — allowed paths
  if (user.role === 'client' || user.role === 'client-MR') {
    const allowed = [
      '/dashboard/client',
      '/dashboard/projects',
      '/dashboard/companies',
      '/dashboard/eqms',
      '/api/',
    ]
    if (allowed.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/dashboard/companies', req.url))
  }

  // Admin-only routes
  const adminOnlyPaths = ['/dashboard/templates', '/dashboard/lists', '/dashboard/users']
  if (adminOnlyPaths.some(p => pathname.startsWith(p)) && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
