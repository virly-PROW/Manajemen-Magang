"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRole } from "@/contexts/RoleContext"
import { X, Bell } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  title: string
  message: string
  link: string | null
  created_at: string
}

export function SlideDownNotification() {
  const { role } = useRole()
  const router = useRouter()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckedIdRef = useRef<string | null>(null)
  const dismissedNotificationsRef = useRef<Set<string>>(new Set())
  const currentNotificationRef = useRef<Notification | null>(null)

  // Load dismissed notifications from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`dismissed_notifications_${role}`)
      if (stored) {
        try {
          const dismissed = JSON.parse(stored) as string[]
          dismissedNotificationsRef.current = new Set(dismissed)
        } catch (error) {
          console.error("Error loading dismissed notifications:", error)
        }
      }
    }
  }, [role])

  // Update ref saat state berubah
  useEffect(() => {
    lastCheckedIdRef.current = lastCheckedId
  }, [lastCheckedId])

  // Polling untuk cek notifikasi baru
  const checkForNewNotifications = useCallback(async () => {
    if (!role) return

    try {
      const response = await fetch(
        `/api/notifications?role=${role}&limit=1&unreadOnly=true`
      )
      
      if (!response.ok) return

      const data = await response.json()
      const notifications = data.notifications || []

      if (notifications.length > 0) {
        const latestNotification = notifications[0]

        // Cek apakah ini notifikasi baru (belum pernah ditampilkan) dan belum pernah ditutup
        const isNewNotification = latestNotification.id !== lastCheckedIdRef.current
        const isNotDismissed = !dismissedNotificationsRef.current.has(latestNotification.id)

        if (isNewNotification && isNotDismissed) {
          setNotification(latestNotification)
          currentNotificationRef.current = latestNotification
          setIsVisible(true)
          setLastCheckedId(latestNotification.id)

          // Auto-close setelah 5 detik
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(() => {
            handleClose()
          }, 5000)
        }
      }
    } catch (error) {
      console.error("Error checking notifications:", error)
    }
  }, [role])

  // Listen untuk custom event "notification:created"
  useEffect(() => {
    const handleNotificationCreated = () => {
      // Delay sedikit untuk memastikan notifikasi sudah tersimpan di database
      setTimeout(() => {
        checkForNewNotifications()
      }, 500)
    }

    window.addEventListener("notification:created", handleNotificationCreated)

    return () => {
      window.removeEventListener("notification:created", handleNotificationCreated)
    }
  }, [checkForNewNotifications])

  // Polling setiap 10 detik untuk cek notifikasi baru
  useEffect(() => {
    // Reset lastCheckedId saat role berubah, tapi tetap simpan dismissed notifications
    setLastCheckedId(null)
    setIsVisible(false)
    setNotification(null)

    // Load dismissed notifications untuk role baru
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`dismissed_notifications_${role}`)
      if (stored) {
        try {
          const dismissed = JSON.parse(stored) as string[]
          dismissedNotificationsRef.current = new Set(dismissed)
        } catch (error) {
          console.error("Error loading dismissed notifications:", error)
        }
      } else {
        dismissedNotificationsRef.current = new Set()
      }
    }

    // Initial check
    checkForNewNotifications()

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      checkForNewNotifications()
    }, 10000) // Check every 10 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [checkForNewNotifications, role])

  const handleClose = useCallback(() => {
    // Simpan ID notifikasi yang ditutup agar tidak muncul lagi
    const notifToDismiss = currentNotificationRef.current
    if (notifToDismiss?.id && role) {
      dismissedNotificationsRef.current.add(notifToDismiss.id)
      
      // Simpan ke localStorage
      if (typeof window !== "undefined") {
        const dismissedArray = Array.from(dismissedNotificationsRef.current)
        localStorage.setItem(
          `dismissed_notifications_${role}`,
          JSON.stringify(dismissedArray)
        )
      }
    }

    setIsVisible(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Set notification to null setelah animasi selesai
    setTimeout(() => {
      setNotification(null)
      currentNotificationRef.current = null
    }, 300)
  }, [role])

  const handleClick = () => {
    if (notification?.link) {
      router.push(notification.link)
    }
    handleClose()
  }

  if (!notification || !isVisible) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-300 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div
        className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-md w-full cursor-pointer hover:shadow-xl transition-shadow"
        onClick={handleClick}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-2">
              {notification.message}
            </p>
            {notification.link && (
              <p className="text-xs text-blue-600 mt-1">Klik untuk melihat →</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Tutup notifikasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

