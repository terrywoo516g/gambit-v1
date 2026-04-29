import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const pathname = request.nextUrl.pathname

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/login', request.url)
    const fullPath = pathname + request.nextUrl.search
    loginUrl.searchParams.set('next', fullPath)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/workspace/:path*',
    '/workspaces/:path*',
    '/report/:path*',
    '/recharge/:path*',
    '/api/workspaces/:path*',
  ],
}