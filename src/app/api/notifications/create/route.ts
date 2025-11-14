import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import supabase from "@/lib/supabaseClient"

// POST - Create notification (can be called from client with nisn or email)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { nisn, email, role, title, message, link } = body

    if ((!nisn && !email) || !role || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    let user_id: string | null = null

    // Get user_id from nisn or email
    if (nisn) {
      // Get student email from siswa table
      const { data: siswa, error: siswaError } = await supabase
        .from("siswa")
        .select("email")
        .eq("nisn", Number(nisn))
        .single()

      if (siswaError || !siswa || !siswa.email) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        )
      }

      // Get user_id from users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", siswa.email)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      user_id = user.id
    } else if (email) {
      // Get user_id from users table by email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      user_id = user.id
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "Could not determine user_id" },
        { status: 400 }
      )
    }

    // Create notification
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
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      )
    }

    // Trigger event for real-time update
    // This will be handled by the NotificationDropdown component

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

