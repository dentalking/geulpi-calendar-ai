import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check for auth token
  const token = request.cookies.get('auth_token')
  
  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/calendar', '/settings', '/onboarding']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  // Redirect to login if accessing protected route without token
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/calendar/:path*', '/settings/:path*', '/onboarding/:path*']
}