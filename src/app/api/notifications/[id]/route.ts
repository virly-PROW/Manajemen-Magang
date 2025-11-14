import { NextRequest, NextResponse } from "next/server"
import supabase from "@/lib/supabaseClient"

// PATCH - Mark notification as read (simple, no auth needed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = parseInt(params.id)
    
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID" },
        { status: 400 }
      )
    }

    // Mark as read (no user_id check needed)
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select()
      .single()

    if (error) {
      console.error("Error updating notification:", error)
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification: data })
  } catch (error) {
    console.error("Update notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

