import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  let token: string | undefined
  let payload: any
  
  try {
    // Get token from HTTP-only cookie
    token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Verify JWT token
    payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch current user data from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        companyId: users.companyId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      // User no longer exists, clear the cookie
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
      response.cookies.delete('auth-token')
      return response
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    })

  } catch (error) {
    // Log database/auth errors with email notification
    logError('Session verification failed', error, {
      endpoint: '/api/auth/me',
      userId: payload?.userId || 'unknown',
      hasToken: !!token,
      errorType: 'session_verification',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })
    
    return NextResponse.json(
      { error: 'Session verification failed' },
      { status: 500 }
    )
  }
}