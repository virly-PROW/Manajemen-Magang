import { NextRequest, NextResponse } from "next/server"
import { sendPushNotification } from "@/lib/pushNotificationServer"

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

    // Use the server-side utility function
    const result = await sendPushNotification({
      role,
      title,
      message,
      link: link || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Send push error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

