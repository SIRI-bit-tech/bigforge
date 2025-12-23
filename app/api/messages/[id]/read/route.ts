import { NextRequest, NextResponse } from 'next/server'
import { db, messages } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check - retrieve current session
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.warn('Message read attempt without authentication token')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      console.warn('Message read attempt with invalid token')
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Fetch the message by id to verify ownership
    const [message] = await db
      .select({
        id: messages.id,
        receiverId: messages.receiverId,
        senderId: messages.senderId,
        read: messages.read
      })
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Authorization check - verify session user id matches message recipient
    if (message.receiverId !== payload.userId) {
      console.warn(`User ${payload.userId} attempted to mark message ${id} as read (recipient: ${message.receiverId})`)
      return NextResponse.json(
        { error: 'Access denied. You can only mark your own messages as read.' },
        { status: 403 }
      )
    }

    // Only perform update after authentication and authorization checks pass
    const [updatedMessage] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
      .returning()

    if (!updatedMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    console.log(`User ${payload.userId} marked message ${id} as read`)

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    )
  }
}