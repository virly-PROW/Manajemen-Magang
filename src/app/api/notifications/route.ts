import { NextRequest, NextResponse } from "next/server"
import supabase from "@/lib/supabaseClient"

// GET - Get notifications by role (simple, no auth needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const role = searchParams.get("role") // Required: siswa or guru
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!role || (role !== "siswa" && role !== "guru")) {
      return NextResponse.json(
        { error: "Role parameter is required (siswa or guru)" },
        { status: 400 }
      )
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("role", role)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq("read", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    // Get unread count for this role
    let countQuery = supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("role", role)
      .eq("read", false)
    
    const { count } = await countQuery

    return NextResponse.json({
      notifications: data || [],
      unreadCount: count || 0,
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create notification (simple, no user_id needed)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, title, message, link } = body

    if (!role || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: role, title, message" },
        { status: 400 }
      )
    }

    if (role !== "siswa" && role !== "guru") {
      return NextResponse.json(
        { error: "Role must be 'siswa' or 'guru'" },
        { status: 400 }
      )
    }

    // Check if similar notification already exists in the last 2 minutes (prevent spam)
    // Cek berdasarkan title saja karena message bisa berbeda
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("id")
      .eq("role", role)
      .eq("title", title)
      .eq("read", false) // Hanya cek yang belum dibaca
      .gte("created_at", twoMinutesAgo)
      .limit(1)

    if (existingNotifications && existingNotifications.length > 0) {
      return NextResponse.json({ 
        notification: existingNotifications[0],
        skipped: true
      }, { status: 200 })
    }

    // Create notification without user_id (shared for all users with same role)
    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID, not used
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

    // Send push notification
    try {
      const { sendPushNotification } = await import("@/lib/pushNotificationServer")
      const pushResult = await sendPushNotification({
        role,
        title,
        message,
        link: link || null,
      })
      if (pushResult.success) {
        console.log(`📱 Push notification sent to ${pushResult.sent || 0} devices`)
      }
    } catch (pushError) {
      console.error("Error sending push notification:", pushError)
      // Don't fail the notification creation if push fails
    }

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

