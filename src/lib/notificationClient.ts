/**
 * Client-side helper functions for creating notifications
 */

export interface CreateNotificationParams {
  nisn?: number
  email?: string
  role: "siswa" | "guru"
  title: string
  message: string
  link?: string
}

/**
 * Create a notification from client-side
 */
export async function createNotificationClient(params: CreateNotificationParams) {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: params.role,
        title: params.title,
        message: params.message,
        link: params.link,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Error creating notification:", error)
      return { success: false, error }
    }

    const data = await response.json()
    
    // Trigger event for real-time update hanya jika tidak skipped
    if (!data.skipped) {
      window.dispatchEvent(new CustomEvent("notification:created"))
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Create notification error:", error)
    return { success: false, error }
  }
}

