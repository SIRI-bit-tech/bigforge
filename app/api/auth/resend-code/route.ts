import { NextRequest, NextResponse } from 'next/server'
import { generateVerificationData } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // In a real app, you would:
    // 1. Find the user by email in your database
    // 2. Check if they're already verified
    // 3. Generate a new verification code
    // 4. Update the user's verification code and expiry in the database

    // Generate new verification code
    const verificationData = generateVerificationData()

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationData.code)
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