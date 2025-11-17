import { NextRequest, NextResponse } from "next/server"
import supabase from "@/lib/supabaseClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, endpoint, p256dh, auth } = body

    if (!role || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing required fields: role, endpoint, p256dh, auth" },
        { status: 400 }
      )
    }

    if (role !== "siswa" && role !== "guru") {
      return NextResponse.json(
        { error: "Role must be 'siswa' or 'guru'" },
        { status: 400 }
      )
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .single()

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          role,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        })
        .eq("endpoint", endpoint)

      if (error) throw error

      return NextResponse.json({ success: true, updated: true })
    }

    // Create new subscription
    const { error } = await supabase.from("push_subscriptions").insert([
      {
        user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID for role-based
        role,
        endpoint,
        p256dh,
        auth,
      },
    ])

    if (error) {
      console.error("Error saving push subscription:", error)
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Subscribe push error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}










