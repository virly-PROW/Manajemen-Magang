/**
 * Push Notification utilities
 */

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Request push notification permission and subscribe
 */
export async function subscribeToPushNotifications(role: "siswa" | "guru"): Promise<PushSubscriptionData | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported")
    throw new Error("Browser tidak mendukung push notification")
  }

  try {
    // Check VAPID key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey || vapidPublicKey.trim() === "") {
      console.error("VAPID public key is not set")
      throw new Error("VAPID key belum di-set. Silakan generate VAPID keys terlebih dahulu.")
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.warn("Notification permission denied:", permission)
      throw new Error("Permission notifikasi ditolak. Silakan aktifkan di pengaturan browser.")
    }

    // Get service worker registration
    let registration: ServiceWorkerRegistration
    try {
      registration = await navigator.serviceWorker.ready
    } catch (error) {
      console.error("Service worker not ready:", error)
      throw new Error("Service worker belum siap. Pastikan aplikasi sudah di-build dan dijalankan di production mode.")
    }

    // Convert VAPID key
    let applicationServerKey: Uint8Array
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    } catch (error) {
      console.error("Error converting VAPID key:", error)
      throw new Error("Format VAPID key tidak valid")
    }

    // Subscribe to push
    let subscription: PushSubscription
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    } catch (error: any) {
      console.error("Error subscribing to push:", error)
      if (error.name === "NotAllowedError") {
        throw new Error("Push subscription ditolak. Pastikan menggunakan HTTPS atau localhost.")
      }
      throw new Error(`Gagal subscribe: ${error.message || "Unknown error"}`)
    }

    if (!subscription) {
      console.warn("Failed to create push subscription")
      throw new Error("Gagal membuat push subscription")
    }

    // Extract subscription data
    const p256dhKey = subscription.getKey("p256dh")
    const authKey = subscription.getKey("auth")
    
    if (!p256dhKey || !authKey) {
      throw new Error("Failed to extract subscription keys")
    }

    const p256dh = arrayBufferToBase64(p256dhKey)
    const auth = arrayBufferToBase64(authKey)

    // Save subscription to server
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "Gagal menyimpan subscription ke server"
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      console.error("Failed to save subscription:", errorMessage)
      throw new Error(errorMessage)
    }

    console.log("✅ Push notification subscribed successfully")
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh,
        auth,
      },
    }
  } catch (error: any) {
    console.error("Error subscribing to push notifications:", error)
    // Re-throw error dengan message yang jelas
    if (error instanceof Error) {
      throw error
    }
    throw new Error(error?.message || "Gagal mengaktifkan push notification")
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push service
      await subscription.unsubscribe()

      // Remove from server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      })

      console.log("✅ Push notification unsubscribed successfully")
      return true
    }

    return false
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * Check if push notifications are already subscribed
 */
export async function isPushNotificationSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch (error) {
    console.error("Error checking subscription:", error)
    return false
  }
}

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String || base64String.trim() === "") {
    throw new Error("VAPID key is empty")
  }

  // Remove any whitespace
  const cleanKey = base64String.trim()

  // VAPID keys from web-push are already in URL-safe base64 format
  // They need to be converted to standard base64, then to binary
  const padding = "=".repeat((4 - (cleanKey.length % 4)) % 4)
  const base64 = (cleanKey + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  try {
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    // Validate: VAPID public key should be 65 bytes (uncompressed) or 33 bytes (compressed)
    if (outputArray.length !== 65 && outputArray.length !== 33) {
      console.warn(`VAPID key length is ${outputArray.length}, expected 65 or 33 bytes`)
    }
    
    return outputArray
  } catch (error) {
    console.error("Error converting VAPID key:", error)
    throw new Error(`Invalid VAPID key format: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

