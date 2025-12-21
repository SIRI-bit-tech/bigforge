import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateVerificationData, validatePasswordStrength } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Generate verification code
    const verificationData = generateVerificationData()

    // In a real app, you would save this to your database
    // For now, we'll simulate the user creation
    const newUser = {
      id: Math.random().toString(36).substring(2, 15),
      email,
      name,
      role,
      companyId: "",
      password: hashedPassword,
      emailVerified: false,
      verificationCode: verificationData.code,
      verificationCodeExpiry: verificationData.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationData.code, name)
    } catch (error) {
      console.error("Failed to send verification email:", error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
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
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}