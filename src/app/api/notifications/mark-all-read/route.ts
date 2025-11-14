import { NextRequest, NextResponse } from "next/server"
import supabase from "@/lib/supabaseClient"

// PATCH - Mark all notifications as read for a role
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    if (!role || (role !== "siswa" && role !== "guru")) {
      return NextResponse.json(
        { error: "Role parameter is required (siswa or guru)" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("role", role)
      .eq("read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark all read error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

