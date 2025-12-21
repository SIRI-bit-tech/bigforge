import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateVerificationData, validatePasswordStrength } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import { db, users, verificationCodes } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Rate limiting store (in production, use Redis or a proper rate limiting service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5 // 5 attempts per window

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return `register:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // First attempt or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: record.resetTime }
  }

  // Increment count
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
      const resetIn = Math.ceil((rateLimit.resetTime! - Date.now()) / 1000 / 60) // minutes
      console.warn(`Rate limit exceeded for registration attempt from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${resetIn} minutes.` },
        { status: 429 }
      )
    }

    const { email, password, name, role } = await request.json()

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existingUser.length > 0) {
      console.warn('Registration attempt with existing email:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString(),
        ip: rateLimitKey.split(':')[1]
      })
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      // Log detailed errors for debugging (always available in server logs)
      console.warn('Password validation failed:', {
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email for privacy
        errors: passwordValidation.errors,
        timestamp: new Date().toISOString()
      })

      // Environment-aware error response
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SHOW_PASSWORD_ERRORS === 'true'
      
      if (isDevelopment) {
        // Development: Return detailed errors for better DX
        return NextResponse.json(
          { error: 'Password does not meet requirements', details: passwordValidation.errors },
          { status: 400 }
        )
      } else {
        // Production: Return generic error to prevent information leakage
        return NextResponse.json(
          { error: 'Password does not meet security requirements' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Generate verification code
    const verificationData = generateVerificationData()

    // Create user in database transaction
    let newUser: any
    let verificationCodeId: string

    try {
      // Start transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Insert new user
        const [createdUser] = await tx
          .insert(users)
          .values({
            email: email.toLowerCase(),
            name: name.trim(),
            passwordHash: hashedPassword,
            role: role as 'CONTRACTOR' | 'SUBCONTRACTOR',
            emailVerified: false,
          })
          .returning()

        newUser = createdUser

        // Insert verification code
        const [createdCode] = await tx
          .insert(verificationCodes)
          .values({
            userId: createdUser.id,
            code: verificationData.code,
            expiresAt: verificationData.expiresAt,
          })
          .returning()

        verificationCodeId = createdCode.id
      })

      console.info('User created successfully:', {
        userId: newUser.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        role: newUser.role,
        timestamp: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('Database error during user creation:', dbError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email (after successful DB creation)
    try {
      await sendVerificationEmail(email, verificationData.code, name)
      console.info('Verification email sent successfully:', {
        userId: newUser.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', {
        error: emailError,
        userId: newUser.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        timestamp: new Date().toISOString()
      })

      // TODO: In production, implement a job queue for email retry
      // For now, we'll return an error but the user is still created
      // The user can request a new verification code later
      return NextResponse.json(
        { 
          error: 'Account created but failed to send verification email. Please try resending the verification code.',
          userId: newUser.id,
          canResend: true
        },
        { status: 207 } // 207 Multi-Status: partial success
      )
    }

    // Return success (don't include sensitive data)
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      needsVerification: true,
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}