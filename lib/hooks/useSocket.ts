import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/lib/store'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { currentUser, addMessage, markMessageAsRead } = useStore()

  useEffect(() => {
    if (!currentUser) return

    // Initialize socket connection
    const initSocket = async () => {
      // Ensure socket server is initialized
      await fetch('/api/socket')
      
      // Try to get auth token for WebSocket authentication
      let token = null
      
      try {
        const tokenResponse = await fetch('/api/auth/socket-token', {
          credentials: 'include'
        })
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          token = tokenData.token
        } else {
          console.error('❌ Failed to get socket token:', tokenResponse.status)
        }
      } catch (error) {
        console.error('❌ Error getting socket token:', error)
      }
      
      if (!token) {
        console.error('❌ No auth token found for socket connection')
        return
      }
      
      // Connect to socket with authentication
      socketRef.current = io({
        path: '/api/socket',
        auth: {
          token: token
        }
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        // Join user's personal room
        socket.emit('join-user-room', currentUser.id)
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
      })

      // Listen for new messages
      socket.on('new-message', (messageData) => {
        // Validate that server provided a timestamp
        if (!messageData.sentAt) {
          console.error('Received message without server timestamp, skipping:', messageData.id)
          return
        }

        // Validate timestamp format and parse
        const sentAtDate = new Date(messageData.sentAt)
        if (isNaN(sentAtDate.getTime())) {
          console.error('Received message with invalid timestamp, skipping:', messageData.id, messageData.sentAt)
          return
        }

        // Convert the message data to the proper format
        const formattedMessage = {
          ...messageData,
          sentAt: sentAtDate,
          attachments: messageData.attachments || []
        }
        addMessage(formattedMessage)
      })

      // Listen for message read confirmations
      socket.on('message-read', (data) => {
        // Update the message read status in the store
        markMessageAsRead(data.messageId)
      })

      // Listen for typing indicators
      socket.on('user-typing', (data) => {
        // Handle typing indicator UI updates
      })

      socket.on('user-stopped-typing', (data) => {
        // Handle stop typing UI updates
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        // Disconnected from Socket.IO server
      })
    }

    initSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [currentUser, addMessage, markMessageAsRead])

  const sendMessage = (messageData: any) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', messageData)
    }
  }

  const joinProjectRoom = (projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-project-room', projectId)
    }
  }

  const markAsRead = (messageId: string, senderId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('mark-message-read', { messageId, senderId })
    }
  }

  const startTyping = (projectId: string, receiverId: string) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing-start', {
        userId: currentUser.id,
        projectId,
        receiverId
      })
    }
  }

  const stopTyping = (projectId: string, receiverId: string) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing-stop', {
        userId: currentUser.id,
        projectId,
        receiverId
      })
    }
  }

  return {
    socket: socketRef.current,
    sendMessage,
    joinProjectRoom,
    markAsRead,
    startTyping,
    stopTyping,
    isConnected: socketRef.current?.connected || false
  }
}