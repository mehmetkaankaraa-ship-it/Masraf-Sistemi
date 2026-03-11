// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isAuthRoute = nextUrl.pathname.startsWith('/login')
  const isApiRoute = nextUrl.pathname.startsWith('/api')
  const isUploadRoute = nextUrl.pathname.startsWith('/api/uploads')

  // Allow public API auth routes
  if (nextUrl.pathname.startsWith('/api/auth')) return NextResponse.next()

  // Protect upload streams — require session
  if (isUploadRoute && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isApiRoute) return NextResponse.next()

  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
