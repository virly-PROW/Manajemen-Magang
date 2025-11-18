import supabase from "./supabaseClient"

export interface CreateNotificationParams {
  user_id: string
  role: "siswa" | "guru"
  title: string
  message: string
  link?: string
}

/**
 * Create a notification in the database
 * This is a server-side helper function
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { user_id, role, title, message, link } = params

    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id,
          role,
          title,
          message,
          link: link || null,
          read: false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Create notification error:", error)
    return { success: false, error }
  }
}

/**
 * Get user_id from email (for notifications)
 */
export async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (error || !data) {
      console.error("Error fetching user ID:", error)
      return null
    }

    return data.id
  } catch (error) {
    console.error("Get user ID error:", error)
    return null
  }
}

/**
 * Get user_id from NISN (for student notifications)
 */
export async function getUserIdFromNisn(nisn: number): Promise<string | null> {
  try {
    // First get student email from siswa table
    const { data: siswa, error: siswaError } = await supabase
      .from("siswa")
      .select("email")
      .eq("nisn", nisn)
      .single()

    if (siswaError || !siswa || !siswa.email) {
      console.error("Error fetching student email:", siswaError)
      return null
    }

    // Then get user_id from users table
    return await getUserIdFromEmail(siswa.email)
  } catch (error) {
    console.error("Get user ID from NISN error:", error)
    return null
  }
}

/**
 * Get all guru user IDs (for notifications to all teachers)
 */
export async function getAllGuruUserIds(): Promise<string[]> {
  try {
    // Get all users with role guru (assuming there's a way to identify them)
    // For now, we'll need to get all users and filter
    // This might need adjustment based on your user structure
    
    const { data, error } = await supabase
      .from("users")
      .select("id, email")

    if (error || !data) {
      console.error("Error fetching guru user IDs:", error)
      return []
    }

    // For now, return all user IDs
    // You might want to add a role column to users table or use a separate mapping
    return data.map((user) => user.id)
  } catch (error) {
    console.error("Get all guru user IDs error:", error)
    return []
  }
}


















