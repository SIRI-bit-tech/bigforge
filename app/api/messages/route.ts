import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { db, messages, users, projects, bids } from '@/lib/db'
import { eq, and, or, desc } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'

// Get messages for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Extract authenticated user's ID from auth token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Messages fetch attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      // Messages fetch attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Use authenticated user's ID for authorization (ignore userId query param)
    const authenticatedUserId = payload.userId
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    // Note: userId query parameter is ignored for security - we only use the authenticated user's ID

    let query = db
      .select({
        id: messages.id,
        projectId: messages.projectId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        text: messages.text,
        sentAt: messages.sentAt,
        read: messages.read,
        bidId: messages.bidId,
      })
      .from(messages)
      .where(
        or(
          eq(messages.senderId, authenticatedUserId),
          eq(messages.receiverId, authenticatedUserId)
        )
      )

    // Filter by project if specified
    if (projectId) {
      query = db
        .select({
          id: messages.id,
          projectId: messages.projectId,
          senderId: messages.senderId,
          receiverId: messages.receiverId,
          text: messages.text,
          sentAt: messages.sentAt,
          read: messages.read,
          bidId: messages.bidId,
        })
        .from(messages)
        .where(
          and(
            or(
              eq(messages.senderId, authenticatedUserId),
              eq(messages.receiverId, authenticatedUserId)
            ),
            eq(messages.projectId, projectId)
          )
        )
    }

    const userMessages = await query.orderBy(desc(messages.sentAt))

    // Convert timestamps to ISO strings for proper JSON serialization
    const formattedMessages = userMessages.map(msg => ({
      ...msg,
      sentAt: msg.sentAt.toISOString()
    }))

    // User fetched messages

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    logError('messages endpoint error', error, {
      endpoint: '/api/messages',
      errorType: 'messages_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch messages'  },
      { status: 500 }
    )
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  try {
    // Extract authenticated user's ID from auth token
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Message send attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      // Message send attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Use authenticated user's ID as sender (ignore senderId from request body)
    const authenticatedUserId = payload.userId

    const { projectId, receiverId, text, bidId, attachments } = await request.json()

    // Validate input (removed senderId validation since we use authenticated user)
    if (!projectId || !receiverId || (!text && (!attachments || attachments.length === 0))) {
      return NextResponse.json(
        { error: 'Project ID, receiver ID, and either text or attachments are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if the session user is allowed to send messages for the given project
    // Users can send messages if they are:
    // 1. The project owner (contractor), OR
    // 2. A subcontractor who has submitted a bid to this project
    const isProjectOwner = project.createdById === authenticatedUserId

    let canSendMessage = isProjectOwner

    if (!canSendMessage) {
      // Check if user has submitted a bid to this project (indicating legitimate access)
      const [userBid] = await db
        .select({ id: bids.id })
        .from(bids)
        .where(
          and(
            eq(bids.projectId, projectId),
            eq(bids.subcontractorId, authenticatedUserId)
          )
        )
        .limit(1)

      canSendMessage = !!userBid
    }

    if (!canSendMessage) {
      // User attempted to send message for unauthorized project
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner or have submitted a bid to send messages for this project.' },
        { status: 403 }
      )
    }

    // Verify receiver exists
    const [receiver] = await db
      .select()
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1)

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    // Prevent users from sending messages to themselves
    if (authenticatedUserId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      )
    }

    // Create message using authenticated user as sender
    const [newMessage] = await db
      .insert(messages)
      .values({
        projectId,
        senderId: authenticatedUserId, // Use authenticated user's ID
        receiverId,
        text: text?.trim() || '',
        bidId: bidId || null,
        read: false,
        sentAt: new Date(),
      })
      .returning()

    // Message sent: messageId, projectId, senderId, receiverId, timestamp, hasAttachments

    // Format the message for JSON response
    const formattedMessage = {
      ...newMessage,
      sentAt: newMessage.sentAt.toISOString(),
      attachments: attachments || []
    }

    return NextResponse.json({ message: formattedMessage }, { status: 201 })
  } catch (error) {
    logError('messages endpoint error', error, {
      endpoint: '/api/messages',
      errorType: 'messages_error',
      severity: 'high'
    })
    
    return NextResponse.json(
      { error: 'Failed to send message'  },
      { status: 500 }
    )
  }
}