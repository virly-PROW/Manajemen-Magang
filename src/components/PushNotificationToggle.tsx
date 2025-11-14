"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
  isPushNotificationSubscribed,
} from "@/lib/pushNotification"
import { useRole } from "@/contexts/RoleContext"
import { toast } from "sonner"

export function PushNotificationToggle() {
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

  const handleToggle = async (checked: boolean) => {
    if (!role) {
      toast.error("Pilih role terlebih dahulu")
      return
    }

    setIsLoading(true)
    try {
      if (checked) {
        const result = await subscribeToPushNotifications(role)
        if (result) {
          setIsSubscribed(true)
          toast.success("Push notification diaktifkan")
        } else {
          setIsSubscribed(false)
          toast.error("Gagal mengaktifkan push notification")
        }
      } else {
        const result = await unsubscribeFromPushNotifications()
        if (result) {
          setIsSubscribed(false)
          toast.success("Push notification dinonaktifkan")
        } else {
          setIsSubscribed(true)
          toast.error("Gagal menonaktifkan push notification")
        }
      }
    } catch (error: any) {
      console.error("Error toggling push notification:", error)
      const errorMessage = error?.message || "Gagal mengubah status push notification"
      toast.error(errorMessage)
      // Revert state on error
      setIsSubscribed(!checked)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <Switch
      checked={isSubscribed}
      onCheckedChange={handleToggle}
      disabled={isLoading || !role}
      className="ml-auto"
    />
  )
}




