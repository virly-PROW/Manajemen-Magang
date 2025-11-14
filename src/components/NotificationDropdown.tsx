"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { IconBell, IconCheck, IconX } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/contexts/RoleContext"
import { PushNotificationButton } from "@/components/PushNotificationButton"

interface Notification {
  id: number
  user_id: string
  role: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export function NotificationDropdown() {
  const { role } = useRole() // Get role from context (siswa or guru)
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = async () => {
    if (!role) return

    try {
      // Fetch only unread notifications
      const response = await fetch(`/api/notifications?limit=20&role=${role}&unreadOnly=true`)
      if (!response.ok) {
        console.error("Failed to fetch notifications:", response.status)
        return
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  useEffect(() => {
    if (role) {
      fetchNotifications()
      
      // Poll for new notifications every 30 seconds
      intervalRef.current = setInterval(fetchNotifications, 30000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [role]) // Re-fetch when role changes

  // Listen for custom events to refresh notifications
  useEffect(() => {
    const handleNotificationEvent = () => {
      fetchNotifications()
    }

    window.addEventListener("notification:created", handleNotificationEvent)
    return () => {
      window.removeEventListener("notification:created", handleNotificationEvent)
    }
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
        })
        // Hapus notifikasi dari tampilan setelah dibaca
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (error) {
        console.error("Error marking notification as read:", error)
      }
    }

    // Navigate to link if available
    if (notification.link) {
      router.push(notification.link)
      setOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch(`/api/notifications/mark-all-read?role=${role}`, {
        method: "PATCH",
      })
      // Hapus semua notifikasi dari tampilan (karena sudah dibaca semua)
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Baru saja"
      if (diffMins < 60) return `${diffMins} menit yang lalu`
      if (diffHours < 24) return `${diffHours} jam yang lalu`
      if (diffDays < 7) return `${diffDays} hari yang lalu`
      
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    } catch {
      return "Baru saja"
    }
  }

  if (!role) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setOpen(!open)}
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          <div className="flex items-center gap-2">
            <PushNotificationButton />
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAllRead()
                }}
              >
                Tandai semua
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="px-2 py-1.5 cursor-pointer hover:bg-accent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

