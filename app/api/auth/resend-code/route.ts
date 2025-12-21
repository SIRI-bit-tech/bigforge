import { NextRequest, NextResponse } from 'next/server'
import { generateVerificationData } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import { db, users, verificationCodes } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// Rate limiting store (in production, use Redis or a proper rate limiting service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration - more restrictive for resend to prevent email spam
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_ATTEMPTS = 3 // 3 resend attempts per hour

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return `resend:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: record.resetTime }
  }

  record.count++
  rateLimitStore.set(key, record)
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetTime! - Date.now()) / 1000 / 60)
      console.warn(`Rate limit exceeded for resend code from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many resend attempts. Please try again in ${resetIn} minutes.` },
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

    if (!user) {
      console.warn('Resend attempt for non-existent user:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
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
      message: 'Verification code sent successfully',
    })

  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json(
      { error: 'Failed to resend code. Please try again.' },
      { status: 500 }
    )
  }
}