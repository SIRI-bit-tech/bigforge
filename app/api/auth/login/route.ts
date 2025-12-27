import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, generateJWT } from '@/lib/services/auth'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'
import { logError, logWarning } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.LOGIN.keyPrefix)
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN)
    
    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      console.warn(`Rate limit exceeded for login attempt from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }



    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!user) {
      console.warn('Login attempt for non-existent user:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      console.warn('Invalid password for user:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      console.warn('Login attempt with unverified email:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { 
          error: 'Please verify your email address before logging in',
          needsVerification: true,
          email: user.email
        },
        { status: 403 }
      )
    }

    // Generate JWT token with minimal claims
    const tokenPayload = { 
      userId: user.id, 
      role: user.role,
      companyId: user.companyId || undefined
    }
    const token = generateJWT(tokenPayload)



    // Create response with user data (no token in body)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        companyId: user.companyId,
      }
    })

    // Set httpOnly cookie with JWT token
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      sameSite: 'lax', // Lax for better compatibility with redirects
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    })

    return response

  } catch (error) {
    // Log login errors with email notification
    logError('Login system error', error, {
      endpoint: '/api/auth/login',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      errorType: 'login_system_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}