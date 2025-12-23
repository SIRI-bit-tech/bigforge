"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Folder, Users, MessageSquare, BarChart3, Inbox, ClipboardList, Settings } from "lucide-react"

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const { currentUser, messages } = useStore()

  if (!currentUser) return null

  // Count unread messages
  const unreadCount = messages.filter(msg => 
    msg.receiverId === currentUser.id && !msg.read
  ).length

  const contractorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Folder },
    { href: "/subcontractors", label: "Subcontractors", icon: Users },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const subcontractorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/opportunities", label: "Opportunities", icon: Folder },
    { href: "/invitations", label: "Invitations", icon: Inbox },
    { href: "/my-bids", label: "My Bids", icon: ClipboardList },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const links = currentUser.role === "CONTRACTOR" ? contractorLinks : subcontractorLinks

  const sidebarClasses = mobile 
    ? "flex w-full flex-col" 
    : "hidden lg:flex w-64 flex-col border-r border-border bg-muted/30"

  return (
    <aside className={sidebarClasses}>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (pathname && pathname.startsWith(link.href + "/"))
            const showBadge = link.href === "/messages" && unreadCount > 0

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
                {showBadge && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
