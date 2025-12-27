import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { db, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    // Note: This endpoint is primarily for system-generated notifications
    // Consider restricting to system/admin roles only if user-created notifications aren't needed
    
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

    const { userId, type, title, message, link } = await request.json()

    // Validate input
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, and message are required' },
        { status: 400 }
      )
    }

    // Authorization check: Only system/admin roles can create notifications
    // Regular users should not be able to create arbitrary notifications
    if (payload.role !== 'ADMIN' && payload.role !== 'SYSTEM') {
      // User with non-admin role attempted to create notification
      return NextResponse.json(
        { error: 'Access denied. Only system administrators can create notifications.' },
        { status: 403 }
      )
    }

    // Additional validation: Even admins should only create notifications for valid users
    // (In a real system, you might want to verify the target userId exists in the users table)

    // Create notification
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        link: link || null,
        read: false,
        createdAt: new Date(),
      })
      .returning()

    return NextResponse.json({
      success: true,
      notification: newNotification
    }, { status: 201 })

  } catch (error) {
    logError('notifications endpoint error', error, {
      endpoint: '/api/notifications',
      errorType: 'notifications_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to create notification'  },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Get notifications for the authenticated user
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, payload.userId))
      .orderBy(notifications.createdAt)

    return NextResponse.json({
      success: true,
      notifications: userNotifications
    })

  } catch (error) {
    logError('notifications endpoint error', error, {
      endpoint: '/api/notifications',
      errorType: 'notifications_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch notifications'  },
      { status: 500 }
    )
  }
}