import { NextRequest, NextResponse } from 'next/server'
import { generateJWT } from '@/lib/services/auth'
import { db, users, verificationCodes } from '@/lib/db'
import { eq, and, gt } from 'drizzle-orm'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.EMAIL_VERIFICATION.keyPrefix)
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.EMAIL_VERIFICATION)
    
    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      // Rate limit exceeded for email verification
      return NextResponse.json(
        { error: `Too many verification attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email, code } = await request.json()

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    // Validate code format
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      // Invalid verification code format provided
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      )
    }



    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    // Security: Don't reveal if user exists or not - use generic error for both cases
    if (!user) {
      // Log for security monitoring without revealing user existence
      // Verification attempt with invalid request
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Find valid verification code
    const [verificationRecord] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, user.id),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!verificationRecord) {
      // Invalid or expired verification code provided
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Update user and mark code as used in transaction
    try {
      await db.transaction(async (tx) => {
        // Mark user as verified
        await tx
          .update(users)
          .set({ 
            emailVerified: true,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id))

        // Mark verification code as used
        await tx
          .update(verificationCodes)
          .set({ used: true })
          .where(eq(verificationCodes.id, verificationRecord.id))
      })



      // Generate JWT token for automatic login after verification
      const tokenPayload = { 
        userId: user.id, 
        role: user.role,
        companyId: user.companyId || undefined
      }
      const token = generateJWT(tokenPayload)

      // Create response with user data
      const response = NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true,
          companyId: user.companyId,
        }
      })

      // Set httpOnly cookie with JWT token (auto-login after verification)
      const isProduction = process.env.NODE_ENV === 'production'
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      })

      return response

    } catch (dbError) {
      // Database error during email verification
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    // Email verification error
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}