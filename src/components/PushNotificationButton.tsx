"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { IconBell, IconBellOff } from "@tabler/icons-react"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
  isPushNotificationSubscribed,
} from "@/lib/pushNotification"
import { useRole } from "@/contexts/RoleContext"
import { toast } from "sonner"

export function PushNotificationButton() {
  const { role } = useRole()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const checkSupport = async () => {
      setIsSupported(isPushNotificationSupported())
      if (isPushNotificationSupported()) {
        const subscribed = await isPushNotificationSubscribed()
        setIsSubscribed(subscribed)
      }
    }
    checkSupport()
  }, [])

  const handleSubscribe = async () => {
    if (!role) {
      toast.error("Pilih role terlebih dahulu")
      return
    }

    setIsLoading(true)
    try {
      const result = await subscribeToPushNotifications(role)
      if (result) {
        setIsSubscribed(true)
        toast.success("Push notification diaktifkan")
      } else {
        toast.error("Gagal mengaktifkan push notification")
      }
    } catch (error: any) {
      console.error("Error subscribing:", error)
      const errorMessage = error?.message || "Gagal mengaktifkan push notification"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsLoading(true)
    try {
      const result = await unsubscribeFromPushNotifications()
      if (result) {
        setIsSubscribed(false)
        toast.success("Push notification dinonaktifkan")
      } else {
        toast.error("Gagal menonaktifkan push notification")
      }
    } catch (error) {
      console.error("Error unsubscribing:", error)
      toast.error("Gagal menonaktifkan push notification")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return null // Don't show button if not supported
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={isLoading || !role}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <IconBellOff className="h-4 w-4" />
          <span>Nonaktifkan Push</span>
        </>
      ) : (
        <>
          <IconBell className="h-4 w-4" />
          <span>Aktifkan Push</span>
        </>
      )}
    </Button>
  )
}

