import { NextRequest, NextResponse } from "next/server"
import supabase from "@/lib/supabaseClient"

// POST - Create notification for guru role (simple, shared for all)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, link } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if similar notification already exists in the last 2 minutes (prevent spam)
    // Cek berdasarkan title saja karena message bisa berbeda (ada tanggal)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("id")
      .eq("role", "guru")
      .eq("title", title)
      .eq("read", false) // Hanya cek yang belum dibaca
      .gte("created_at", twoMinutesAgo)
      .limit(1)

    if (existingNotifications && existingNotifications.length > 0) {
      return NextResponse.json({ 
        notification: existingNotifications[0],
        count: 0,
        skipped: true
      }, { status: 200 })
    }

    // Create single notification for guru role (shared for all users)
    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID, not used
          role: "guru",
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
        { error: "Failed to create notification", details: error },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully created notification for guru role`)

    // Send push notification
    try {
      const { sendPushNotification } = await import("@/lib/pushNotificationServer")
      const pushResult = await sendPushNotification({
        role: "guru",
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

    return NextResponse.json({ 
      notification: data,
      count: 1
    }, { status: 201 })
  } catch (error) {
    console.error("Create notification for guru error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

