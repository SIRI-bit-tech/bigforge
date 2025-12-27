import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/lib/store'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { currentUser, addMessage, markMessageAsRead, loadNotifications, addNotification } = useStore()

  useEffect(() => {
    if (!currentUser) return

    // Initialize socket connection
    const initSocket = async () => {
      try {
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
            return
          }
        } catch (error) {
          return
        }
        
        if (!token) {
          return
        }
        
        // Connect to socket with authentication
        socketRef.current = io({
          path: '/api/socket',
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        })

        const socket = socketRef.current

        socket.on('connect', () => {
          // Join user's personal room immediately
          socket.emit('join-user-room', currentUser.id)
          
          // Load notifications when socket connects to ensure we have latest data
          loadNotifications()
        })

        socket.on('connect_error', (error) => {
          // Socket connection error
        })

        // Listen for new messages
        socket.on('new-message', (messageData) => {
          // Validate that server provided a timestamp
          if (!messageData.sentAt) {
            return
          }

          // Validate timestamp format and parse
          const sentAtDate = new Date(messageData.sentAt)
          if (isNaN(sentAtDate.getTime())) {
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

        // Listen for new notifications
        socket.on('new-notification', (notificationData) => {
          // Format the notification with proper date parsing
          const formattedNotification = {
            ...notificationData,
            createdAt: new Date(notificationData.createdAt),
          }
          
          // Add to local store immediately for real-time display using proper store action
          addNotification(formattedNotification)
        })

        // Listen for typing indicators
        socket.on('user-typing', () => {
          // Handle typing indicator UI updates
        })

        socket.on('user-stopped-typing', () => {
          // Handle stop typing UI updates
        })

        socket.on('error', (error) => {
          // Socket error
        })

        socket.on('disconnect', () => {
          // Disconnected from Socket.IO server
        })
      } catch (error) {
        // Failed to initialize socket
      }
    }

    initSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [currentUser, addMessage, markMessageAsRead, loadNotifications, addNotification])

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