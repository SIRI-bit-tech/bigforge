import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromCookie } from '@/lib/utils/auth-cookies'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get user from httpOnly cookie
    const authUser = await getAuthUserFromCookie(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch fresh user data from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}