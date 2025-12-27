import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, type RateLimitConfig } from '@/lib/utils/rate-limit'

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/my-bids',
  '/messages',
  '/notifications',
  '/settings',
  '/analytics',
  '/opportunities',
  '/invitations',
  '/subcontractors'
]

// Define public routes that should redirect to dashboard if authenticated
const publicRoutes = ['/login', '/register']

// Define API routes that need rate limiting
const rateLimitedRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/resend-code'
]

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss: ws:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  // Rate limiting for sensitive endpoints
  const isRateLimitedRoute = rateLimitedRoutes.some(route => pathname.startsWith(route))
  
  if (isRateLimitedRoute) {
    let rateLimitConfig: RateLimitConfig = RATE_LIMITS.LOGIN // default
    
    if (pathname.includes('/register')) {
      rateLimitConfig = RATE_LIMITS.REGISTRATION
    } else if (pathname.includes('/verify-email')) {
      rateLimitConfig = RATE_LIMITS.EMAIL_VERIFICATION
    } else if (pathname.includes('/resend-code')) {
      rateLimitConfig = RATE_LIMITS.RESEND_CODE
    }
    
    const key = getRateLimitKey(request, rateLimitConfig.keyPrefix)
    const rateLimitResult = await checkRateLimit(key, rateLimitConfig)
    
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests', 
          resetTime: rateLimitResult.resetTime 
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString()
          } 
        }
      )
    }
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0')
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime?.toString() || '0')
  }

  const token = request.cookies.get('auth-token')?.value

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If accessing a protected route without a token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing login/register with a token, redirect to dashboard
  // The AuthProvider will verify the token validity client-side
  if (isPublicRoute && token) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}