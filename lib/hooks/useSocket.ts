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
          console.log('✅ Got auth token for socket connection')
        } else {
          console.error('❌ Failed to get socket token:', tokenResponse.status)
        }
      } catch (error) {
        console.error('❌ Error getting socket token:', error)
      }
      
      if (!token) {
        console.error('❌ No auth token found for socket connection')
        console.log('Current user:', currentUser)
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
        console.log('✅ Connected to Socket.IO server')
        
        // Join user's personal room
        console.log('Joining user room:', currentUser.id)
        socket.emit('join-user-room', currentUser.id)
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
      })

      // Listen for new messages
      socket.on('new-message', (messageData) => {
        console.log('📨 Received new message via socket:', messageData)
        // Convert the message data to the proper format
        const formattedMessage = {
          ...messageData,
          sentAt: new Date(messageData.sentAt || new Date()),
          attachments: messageData.attachments || []
        }
        addMessage(formattedMessage)
      })

      // Listen for message read confirmations
      socket.on('message-read', (data) => {
        console.log('Message marked as read:', data)
        // Update the message read status in the store
        markMessageAsRead(data.messageId)
      })

      // Listen for typing indicators
      socket.on('user-typing', (data) => {
        // Handle typing indicator UI updates
        console.log('User typing:', data)
      })

      socket.on('user-stopped-typing', (data) => {
        // Handle stop typing UI updates
        console.log('User stopped typing:', data)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server')
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