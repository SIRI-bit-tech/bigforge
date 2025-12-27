import { NextRequest, NextResponse } from 'next/server'
import { db, notifications } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: notificationId } = await params

    // Verify the notification exists and belongs to the authenticated user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, payload.userId)
        )
      )
      .limit(1)

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    // Mark notification as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    // Failed to mark notification as read
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}