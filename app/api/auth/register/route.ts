import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateVerificationData, validatePasswordStrength } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import { db, users, verificationCodes } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'
import { logError, logWarning } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.REGISTRATION.keyPrefix)
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.REGISTRATION)
    
    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      console.warn(`Rate limit exceeded for registration attempt from ${rateLimitKey}`)
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${resetIn}.` },
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



    } catch (dbError) {
      // Log database errors with email notification
      logError('Database error during user registration', dbError, {
        endpoint: '/api/auth/register',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        errorType: 'registration_database_error',
        severity: 'critical'
      })
      
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email (after successful DB creation)
    try {
      await sendVerificationEmail(email, verificationData.code, name)

    } catch (emailError) {
      // Log email sending errors
      logError('Failed to send verification email', emailError, {
        endpoint: '/api/auth/register',
        userId: newUser.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        errorType: 'email_sending_error',
        severity: 'medium'
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
    // Log registration system errors with email notification
    logError('Registration system error', error, {
      endpoint: '/api/auth/register',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      errorType: 'registration_system_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}