import { NextRequest, NextResponse } from 'next/server'
import { db, users, verificationCodes } from '@/lib/db'
import { eq, and, gt } from 'drizzle-orm'

// Rate limiting store (in production, use Redis or a proper rate limiting service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10 // 10 verification attempts per window

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return `verify:${ip}`
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
      console.warn(`Rate limit exceeded for email verification from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many verification attempts. Please try again in ${resetIn} minutes.` },
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
      console.warn('Invalid verification code format provided:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        codeLength: code.length,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      )
    }

    // Log verification attempt (for security monitoring)
    console.info('Email verification attempt:', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email
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
      console.warn('Verification attempt for non-existent user:', {
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
      console.warn('Invalid or expired verification code:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
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

      console.info('Email verification successful:', {
        userId: user.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true,
        }
      })

    } catch (dbError) {
      console.error('Database error during email verification:', dbError)
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}