import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the auth token cookie
    response.cookies.delete('auth-token')

    return response

  } catch (error) {
    // Logout error
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}