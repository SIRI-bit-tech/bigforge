import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { NextApiResponse } from 'next'
import { verifyJWT } from '@/lib/services/auth'
import { db, projects, bids, messages } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import redis from '@/lib/cache/redis'

export type SocketServer = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer
    }
  }
}

// Global reference to the socket server for broadcasting notifications
let globalIO: SocketIOServer | null = null

// Connection tracking for monitoring
const connectionStats = {
  totalConnections: 0,
  authenticatedConnections: 0,
  messagesSent: 0,
  errorsCount: 0
}

// Function to get or initialize the socket server
export const getSocketServer = (): SocketIOServer | null => {
  return globalIO
}

// Function to set the socket server (called from the API route)
export const setSocketServer = (io: SocketIOServer) => {
  globalIO = io
  // Socket server (globalIO) has been set
}

// Get connection statistics
export const getConnectionStats = () => ({ ...connectionStats })

// Helper function to broadcast notifications to a specific user
export const broadcastNotification = (userId: string, notification: any) => {
  if (!globalIO) {
    return
  }
  
  // Broadcast to user's room
  const userRoom = `user:${userId}`
  const connectedSockets = globalIO.sockets.adapter.rooms.get(userRoom)
  
  if (connectedSockets && connectedSockets.size > 0) {
    // User is connected, send notification immediately
    globalIO.to(userRoom).emit('new-notification', notification)
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
    ;(socket as any).lastActivity = Date.now()

    return true
  } catch (error) {
    // Socket authentication failed
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
    // Error checking project permission
    return false
  }
}

// Helper function to handle violations and potentially disconnect malicious clients
const handleViolation = (socket: Socket, reason: string) => {
  const socketAny = socket as any
  socketAny.violationCount = (socketAny.violationCount || 0) + 1
  connectionStats.errorsCount++
  
  // Socket violation from ${socketAny.userId || 'unknown'}: ${reason}
  
  // Disconnect after 3 violations
  if (socketAny.violationCount >= 3) {
    socket.emit('error', { message: 'Connection terminated due to repeated security violations' })
    socket.disconnect()
  } else {
    socket.emit('error', { message: `Unauthorized action: ${reason}` })
  }
}

// Rate limiting for socket events
const checkSocketRateLimit = async (socket: Socket, eventType: string): Promise<boolean> => {
  const socketAny = socket as any
  if (!socketAny.userId) return false
  
  const key = `socket:${eventType}:${socketAny.userId}`
  const config = RATE_LIMITS.WEBSOCKET_MESSAGE
  
  const result = await checkRateLimit(key, config)
  return result.allowed
}

export const initSocket = (res: SocketServer) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      // Performance optimizations for high concurrency
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true,
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      }
    })

    // Redis adapter for horizontal scaling (optional)
    if (process.env.REDIS_HOST) {
      // Redis adapter for Socket.IO not configured. Install @socket.io/redis-adapter for horizontal scaling.
    }

    // Store global reference for broadcasting notifications
    globalIO = io

    // Middleware for authentication and rate limiting
    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication required'))
      }

      // Rate limit connection attempts
      const connectKey = `socket:connect:${socket.handshake.address}`
      const connectRateLimit = await checkRateLimit(connectKey, RATE_LIMITS.WEBSOCKET_CONNECT)
      
      if (!connectRateLimit.allowed) {
        return next(new Error('Too many connection attempts'))
      }

      const isAuthenticated = await authenticateSocket(socket, token)
      
      if (!isAuthenticated) {
        return next(new Error('Invalid authentication token'))
      }

      next()
    })

    // Handle socket connections with authentication
    io.on('connection', async (socket: Socket) => {
      const socketAny = socket as any
      
      connectionStats.totalConnections++
      connectionStats.authenticatedConnections++
      
      // Socket connected: ${socketAny.userId} (${connectionStats.authenticatedConnections} active)

      // Heartbeat to track active connections
      const heartbeatInterval = setInterval(() => {
        socketAny.lastActivity = Date.now()
        socket.emit('heartbeat', { timestamp: Date.now() })
      }, 30000) // 30 seconds

      // 1) Join user room - validate userId matches authenticated user
      socket.on('join-user-room', async (userId: string) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated')
          return
        }

        if (socketAny.userId !== userId) {
          handleViolation(socket, `Attempted to join room for different user (${userId})`)
          return
        }

        // Rate limit room joins
        const allowed = await checkSocketRateLimit(socket, 'join-room')
        if (!allowed) {
          handleViolation(socket, 'Rate limit exceeded for room joins')
          return
        }

        socket.join(`user:${userId}`)
        socket.emit('room-joined', { room: `user:${userId}` })
      })

      // Join project room - validate project membership/permission
      socket.on('join-project-room', async (projectId: string) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated')
          return
        }

        // Rate limit room joins
        const allowed = await checkSocketRateLimit(socket, 'join-room')
        if (!allowed) {
          handleViolation(socket, 'Rate limit exceeded for room joins')
          return
        }

        const hasPermission = await checkProjectPermission(socketAny.userId, projectId)
        if (!hasPermission) {
          handleViolation(socket, `Unauthorized project access (${projectId})`)
          return
        }

        socket.join(`project:${projectId}`)
        socket.emit('room-joined', { room: `project:${projectId}` })
      })

      // 2) Send message - authenticate sender and validate permissions
      socket.on('send-message', async (messageData) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for messaging')
          return
        }

        // Rate limit messages
        const allowed = await checkSocketRateLimit(socket, 'send-message')
        if (!allowed) {
          socket.emit('error', { message: 'Rate limit exceeded for messaging' })
          return
        }

        // Override any client-supplied senderId with authenticated user ID
        const sanitizedData = {
          ...messageData,
          senderId: socketAny.userId, // Use authenticated user ID
          text: typeof messageData.text === 'string' ? messageData.text.trim().slice(0, 1000) : '', // Sanitize and limit message length
          sentAt: messageData.sentAt || new Date().toISOString(),
          attachments: Array.isArray(messageData.attachments) ? messageData.attachments.slice(0, 5) : [] // Limit attachments
        }

        // Validate required fields
        if (!sanitizedData.projectId || !sanitizedData.receiverId || !sanitizedData.text) {
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

        connectionStats.messagesSent++
        
        // Broadcast to receiver's personal room (for real-time delivery)
        socket.to(`user:${sanitizedData.receiverId}`).emit('new-message', sanitizedData)
        
        // Also broadcast to project room (for anyone viewing the project)
        socket.to(`project:${sanitizedData.projectId}`).emit('new-message', sanitizedData)
        
        // Acknowledge message sent
        socket.emit('message-sent', { messageId: sanitizedData.id || Date.now() })
      })

      // 3) Mark message as read - validate authorization
      socket.on('mark-message-read', async (data) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for message read')
          return
        }

        // Rate limit read operations
        const allowed = await checkSocketRateLimit(socket, 'mark-read')
        if (!allowed) {
          socket.emit('error', { message: 'Rate limit exceeded for read operations' })
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
          // Error validating message read
          handleViolation(socket, 'Message read validation failed')
        }
      })

      // Handle typing indicators with validation
      socket.on('typing-start', async (data) => {
        if (!socketAny.userId) {
          handleViolation(socket, 'Not authenticated for typing indicator')
          return
        }

        // Rate limit typing indicators
        const allowed = await checkSocketRateLimit(socket, 'typing')
        if (!allowed) {
          return // Silently ignore typing indicators when rate limited
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

      // Handle heartbeat response
      socket.on('heartbeat-response', () => {
        socketAny.lastActivity = Date.now()
      })

      socket.on('disconnect', (reason) => {
        connectionStats.authenticatedConnections--
        clearInterval(heartbeatInterval)
        // Socket disconnected: ${socketAny.userId} (${reason}) - ${connectionStats.authenticatedConnections} remaining
      })

      // Handle connection errors
      socket.on('error', (error) => {
        connectionStats.errorsCount++
        // Socket error for user ${socketAny.userId}: ${error}
      })
    })

    // Monitor connection health
    setInterval(() => {
      const now = Date.now()
      const staleThreshold = 5 * 60 * 1000 // 5 minutes
      
      io.sockets.sockets.forEach((socket) => {
        const socketAny = socket as any
        if (socketAny.lastActivity && (now - socketAny.lastActivity) > staleThreshold) {
          // Disconnecting stale socket: ${socketAny.userId}
          socket.disconnect()
        }
      })
    }, 60000) // Check every minute

    res.socket.server.io = io
  }
  
  return res.socket.server.io
}