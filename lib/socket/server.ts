import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { NextApiResponse } from 'next'
import { verifyJWT } from '@/lib/services/auth'
import { db, projects, bids, messages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export type SocketServer = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer
    }
  }
}

// Helper function to authenticate socket connection
const authenticateSocket = async (socket: Socket, token: string): Promise<boolean> => {
  try {
    const payload = verifyJWT(token)
    if (!payload) {
      return false
    }

    // Attach user info to socket for authorization checks
    ;(socket as any).userId = payload.userId
    ;(socket as any).role = payload.role
    ;(socket as any).companyId = payload.companyId
    ;(socket as any).violationCount = 0

    return true
  } catch (error) {
    console.warn('Socket authentication failed:', error)
    return false
  }
}

// Helper function to check project membership/permission
const checkProjectPermission = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    // Check if user is project owner OR has submitted a bid
    const [project] = await db
      .select({ createdById: projects.createdById })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (project?.createdById === userId) {
      return true // Project owner
    }

    // Check if user has submitted a bid
    const [bid] = await db
      .select({ id: bids.id })
      .from(bids)
      .where(
        and(
          eq(bids.projectId, projectId),
          eq(bids.subcontractorId, userId)
        )
      )
      .limit(1)

    return !!bid // Has submitted a bid
  } catch (error) {
    console.error('Error checking project permission:', error)
    return false
  }
}

// Helper function to handle violations and potentially disconnect malicious clients
const handleViolation = (socket: Socket, reason: string) => {
  const socketAny = socket as any
  socketAny.violationCount = (socketAny.violationCount || 0) + 1
  console.warn(`Socket violation for user ${socketAny.userId}: ${reason} (count: ${socketAny.violationCount})`)
  
  // Disconnect after 3 violations
  if (socketAny.violationCount >= 3) {
    console.error(`Disconnecting user ${socketAny.userId} for repeated violations`)
    socket.emit('error', { message: 'Connection terminated due to repeated security violations' })
    socket.disconnect()
  } else {
    socket.emit('error', { message: `Unauthorized action: ${reason}` })
  }
}

export const initSocket = (res: SocketServer) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    // Handle socket connections with authentication
    io.on('connection', async (socket: Socket) => {
      const socketAny = socket as any
      
      console.log('🔌 New socket connection attempt')
      
      // Authenticate socket on connection
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      
      console.log('🔑 Token found:', !!token)
      
      if (!token) {
        console.log('❌ No token provided')
        socket.emit('error', { message: 'Authentication required' })
        socket.disconnect()
        return
      }

      const isAuthenticated = await authenticateSocket(socket, token)
      console.log('🔐 Authentication result:', isAuthenticated)
      
      if (!isAuthenticated) {
        console.log('❌ Authentication failed')
        socket.emit('error', { message: 'Invalid authentication token' })
        socket.disconnect()
        return
      }

      console.log('✅ Socket authenticated for user:', socketAny.userId)

      // 1) Join user room - validate userId matches authenticated user
      socket.on('join-user-room', (userId: string) => {
        console.log('👤 Join user room request:', userId, 'authenticated as:', socketAny.userId)
        
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated')
          return
        }

        if (socketAny.userId !== userId) {
          handleViolation(socket, `Attempted to join room for different user (${userId})`)
          return
        }

        socket.join(`user:${userId}`)
        console.log('✅ User joined room:', `user:${userId}`)
      })

      // Join project room - validate project membership/permission
      socket.on('join-project-room', async (projectId: string) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated')
          return
        }

        const hasPermission = await checkProjectPermission(socketAny.userId, projectId)
        if (!hasPermission) {
          handleViolation(socket, `Unauthorized project access (${projectId})`)
          return
        }

        socket.join(`project:${projectId}`)
      })

      // 2) Send message - authenticate sender and validate permissions
      socket.on('send-message', async (messageData) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for messaging')
          return
        }

        // Override any client-supplied senderId with authenticated user ID
        const sanitizedData = {
          ...messageData,
          senderId: socketAny.userId, // Use authenticated user ID
          text: typeof messageData.text === 'string' ? messageData.text.trim() : '', // Sanitize message
          sentAt: messageData.sentAt || new Date().toISOString(),
          attachments: messageData.attachments || []
        }

        // Validate required fields
        if (!sanitizedData.projectId || !sanitizedData.receiverId) {
          handleViolation(socket, 'Invalid message data')
          return
        }

        // Validate sender has permission for this project
        const hasProjectPermission = await checkProjectPermission(socketAny.userId, sanitizedData.projectId)
        if (!hasProjectPermission) {
          handleViolation(socket, `Unauthorized messaging for project ${sanitizedData.projectId}`)
          return
        }

        // Validate receiver exists and sender isn't messaging themselves
        if (sanitizedData.senderId === sanitizedData.receiverId) {
          handleViolation(socket, 'Cannot send message to self')
          return
        }

        console.log('📤 Broadcasting message via socket to user:', sanitizedData.receiverId)
        console.log('📤 Message data:', { id: sanitizedData.id, text: sanitizedData.text })
        
        // Broadcast to receiver's personal room (for real-time delivery)
        socket.to(`user:${sanitizedData.receiverId}`).emit('new-message', sanitizedData)
        
        // Also broadcast to project room (for anyone viewing the project)
        socket.to(`project:${sanitizedData.projectId}`).emit('new-message', sanitizedData)
        
        console.log('📤 Message broadcast complete')
      })

      // 3) Mark message as read - validate authorization
      socket.on('mark-message-read', async (data) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for message read')
          return
        }

        const { messageId } = data

        if (!messageId) {
          handleViolation(socket, 'Invalid message read data - messageId required')
          return
        }

        try {
          // Verify the message exists and the socket user is the receiver
          const [message] = await db
            .select({
              id: messages.id,
              senderId: messages.senderId,
              receiverId: messages.receiverId,
              projectId: messages.projectId
            })
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1)

          if (!message) {
            handleViolation(socket, `Message not found (${messageId})`)
            return
          }

          // Only the message receiver can mark it as read
          if (message.receiverId !== socketAny.userId) {
            handleViolation(socket, `Unauthorized message read attempt (${messageId})`)
            return
          }

          // Notify the sender using the database-validated senderId
          socket.to(`user:${message.senderId}`).emit('message-read', {
            messageId,
            readBy: socketAny.userId
          })
        } catch (error) {
          console.error('Error validating message read:', error)
          handleViolation(socket, 'Message read validation failed')
        }
      })

      // Handle typing indicators with validation
      socket.on('typing-start', async (data) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for typing indicator')
          return
        }

        if (data.userId !== socketAny.userId) {
          handleViolation(socket, 'Invalid typing user ID')
          return
        }

        const hasPermission = await checkProjectPermission(socketAny.userId, data.projectId)
        if (!hasPermission) {
          handleViolation(socket, `Unauthorized typing indicator for project ${data.projectId}`)
          return
        }

        socket.to(`project:${data.projectId}`).emit('user-typing', {
          userId: socketAny.userId,
          projectId: data.projectId,
          receiverId: data.receiverId
        })
      })

      socket.on('typing-stop', async (data) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for typing indicator')
          return
        }

        if (data.userId !== socketAny.userId) {
          handleViolation(socket, 'Invalid typing user ID')
          return
        }

        const hasPermission = await checkProjectPermission(socketAny.userId, data.projectId)
        if (!hasPermission) {
          handleViolation(socket, `Unauthorized typing indicator for project ${data.projectId}`)
          return
        }

        socket.to(`project:${data.projectId}`).emit('user-stopped-typing', {
          userId: socketAny.userId,
          projectId: data.projectId,
          receiverId: data.receiverId
        })
      })

      socket.on('disconnect', () => {
        // User disconnected
      })
    })

    res.socket.server.io = io
  }
  
  return res.socket.server.io
}