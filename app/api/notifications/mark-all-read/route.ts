import { NextRequest, NextResponse } from 'next/server'
import { db, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function PATCH(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { userId } = await request.json()

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Only allow users to mark their own notifications as read
    if (userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only mark your own notifications as read.' },
        { status: 403 }
      )
    }

    // Mark all notifications as read for the user
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error) {
    // Failed to mark all notifications as read
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}