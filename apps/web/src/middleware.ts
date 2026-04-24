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

  // Client role — restricted access
  if (user.role === 'client') {
    if (
      pathname.startsWith('/dashboard/client') ||
      pathname.startsWith('/dashboard/projects') ||
      pathname.startsWith('/api/')
    ) {
      return NextResponse.next()
    }
    // Everything else → client home
    return NextResponse.redirect(new URL('/dashboard/client', req.url))
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
