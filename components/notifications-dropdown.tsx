"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useSocket } from "@/lib/hooks/useSocket"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

export function NotificationsDropdown() {
  const router = useRouter()
  const { currentUser, getNotificationsByUser, markNotificationAsRead, markAllNotificationsAsRead, loadNotifications } = useStore()
  const { isConnected } = useSocket() // Initialize socket connection
  const [open, setOpen] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)

  // Load notifications when component mounts, user changes, or socket connects
  useEffect(() => {
    if (currentUser) {
      loadNotifications()
    }
  }, [currentUser, isConnected, loadNotifications])

  // Track when new notifications arrive to show animation
  const notifications = currentUser ? getNotificationsByUser(currentUser.id) : []
  const unreadCount = notifications.filter((n) => !n.read).length
  
  // Track previous unread count to detect new notifications
  const [prevUnreadCount, setPrevUnreadCount] = useState(0)
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      setPrevUnreadCount(unreadCount)
      return
    }
    
    // For subsequent updates, animate when unread count increases
    if (unreadCount > prevUnreadCount) {
      setHasNewNotification(true)
      // Reset animation after 3 seconds
      const timer = setTimeout(() => setHasNewNotification(false), 3000)
      return () => clearTimeout(timer)
    }
    
    setPrevUnreadCount(unreadCount)
  }, [unreadCount])
  
  const recentNotifications = notifications.slice(0, 5) // Show only 5 most recent

  if (!currentUser) return null

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "BID_SUBMITTED":
        return "📝"
      case "BID_AWARDED":
        return "🎉"
      case "INVITATION":
        return "📨"
      case "DEADLINE":
        return "⏰"
      case "MESSAGE":
        return "💬"
      default:
        return "🔔"
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
    setOpen(false)
  }

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead(currentUser.id)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(
          "relative",
          hasNewNotification && "animate-pulse"
        )}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white",
              hasNewNotification && "animate-bounce"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        {notifications.length > 0 ? (
          <>
            <ScrollArea className="max-h-96">
              <div className="p-2">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      !notification.read && "bg-blue-50 dark:bg-blue-950/20"
                    )}
                  >
                    <div className="text-lg mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "font-medium text-sm leading-tight",
                          !notification.read && "text-blue-600 dark:text-blue-400"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 overflow-hidden">
                        {notification.message.length > 100 
                          ? `${notification.message.substring(0, 100)}...` 
                          : notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {notifications.length > 5 && (
              <>
                <Separator />
                <div className="p-2">
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm" 
                    onClick={() => {
                      router.push('/notifications')
                      setOpen(false)
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}