import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'

export async function GET(request: NextRequest) {
  try {
    // Get the httpOnly auth token from cookies
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify the token is valid
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Return the token for WebSocket authentication
    // This is safe because it's only accessible to authenticated users
    return NextResponse.json({
      token: token,
      userId: payload.userId,
      role: payload.role
    })

  } catch (error) {
    // Socket token error
    return NextResponse.json(
      { error: 'Failed to get socket token' },
      { status: 500 }
    )
  }
}