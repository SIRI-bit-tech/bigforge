import { NextRequest, NextResponse } from 'next/server'
import { generateVerificationData } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import { db, users, verificationCodes } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.RESEND_CODE.keyPrefix)
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.RESEND_CODE)
    
    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      console.warn(`Rate limit exceeded for resend code from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many resend attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Log resend attempt for security monitoring
    console.info('Verification code resend requested:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      timestamp: new Date().toISOString(),
      ip: rateLimitKey.split(':')[1]
    })

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    // Security: Always return success to prevent user enumeration
    // Only send email if user exists and is not verified
    if (!user) {
      // Log for security monitoring without revealing user existence
      console.warn('Resend attempt for invalid request:', {
        timestamp: new Date().toISOString(),
        ip: rateLimitKey.split(':')[1]
      })
      // Return success to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists and is unverified, a verification code has been sent.',
      })
    }

    // Check if user is already verified
    if (user.emailVerified) {
      // Return success to prevent enumeration, but don't send email
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists and is unverified, a verification code has been sent.',
      })
    }

    // Generate new verification code
    const verificationData = generateVerificationData()

    // Invalidate old codes and create new one in transaction
    try {
      await db.transaction(async (tx) => {
        // Mark all existing unused codes as used (invalidate them)
        await tx
          .update(verificationCodes)
          .set({ used: true })
          .where(
            and(
              eq(verificationCodes.userId, user.id),
              eq(verificationCodes.used, false)
            )
          )

        // Insert new verification code
        await tx
          .insert(verificationCodes)
          .values({
            userId: user.id,
            code: verificationData.code,
            expiresAt: verificationData.expiresAt,
          })
      })

      console.info('New verification code generated:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('Database error during code generation:', dbError)
      return NextResponse.json(
        { error: 'Failed to generate new verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationData.code, user.name)
      console.info('Verification code resent successfully:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists and is unverified, a verification code has been sent.',
    })

  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json(
      { error: 'Failed to resend code. Please try again.' },
      { status: 500 }
    )
  }
}