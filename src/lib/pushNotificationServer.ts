/**
 * Server-side push notification utilities
 */

import supabase from "@/lib/supabaseClient"

// Lazy load web-push to avoid build issues
let webpushModule: any = null
let isConfigured = false

async function getWebPush() {
  if (!webpushModule) {
    webpushModule = await import("web-push")
  }
  
  // Configure VAPID keys only once
  if (!isConfigured) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ""
    const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@example.com"

    if (vapidPublicKey && vapidPrivateKey) {
      webpushModule.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
      isConfigured = true
    }
  }
  
  return webpushModule.default
}

export interface SendPushNotificationParams {
  role: "siswa" | "guru"
  title: string
  message: string
  link?: string | null
}

export async function sendPushNotification(
  params: SendPushNotificationParams
): Promise<{ success: boolean; sent: number; total: number }> {
  try {
    const { role, title, message, link } = params

    // Get all subscriptions for this role
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("role", role)

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError)
      return { success: false, sent: 0, total: 0 }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, total: 0 }
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: {
        url: link || "/",
        role,
      },
    })

    // Get webpush instance
    const webpushInstance = await getWebPush()

    // Send push notification to all subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpushInstance.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        return { success: true, endpoint: sub.endpoint }
      } catch (error: any) {
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint)
        }
        return { success: false, endpoint: sub.endpoint, error: error.message }
      }
    })

    const results = await Promise.allSettled(sendPromises)
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length

    return {
      success: true,
      sent: successful,
      total: subscriptions.length,
    }
  } catch (error) {
    console.error("Send push notification error:", error)
    return { success: false, sent: 0, total: 0 }
  }
}

