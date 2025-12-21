import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.info('User logout requested:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    })

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the auth cookie by setting it to expire immediately
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Expire immediately
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed. Please try again.' },
      { status: 500 }
    )
  }
}