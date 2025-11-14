import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import supabase from "@/lib/supabaseClient"

export async function POST(request: NextRequest) {
  try {
    const { token, password, recaptchaToken } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password must be filled" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Verifikasi reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Please solve the reCAPTCHA first" },
        { status: 400 }
      )
    }

    const recaptchaSecret = "6Lc7AQUsAAAAANELc4KmsLy_C1QWheTmdlCcIQ2M"
    const recaptchaResponse = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`,
      { method: "POST" }
    )

    const recaptchaData = await recaptchaResponse.json()
    if (!recaptchaData.success) {
      return NextResponse.json(
        { error: "reCAPTCHA verification failed" },
        { status: 400 }
      )
    }

    // Cari user dengan reset token yang valid
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, reset_token, reset_token_expires")
      .eq("reset_token", token)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Reset password token is invalid or espired" },
        { status: 400 }
      )
    }

    // Cek apakah token sudah kadaluarsa
    const now = new Date()
    const expiresAt = new Date(user.reset_token_expires)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Reset password token has espired" },
        { status: 400 }
      )
    }

    // Hash password baru
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Update password dan hapus reset token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json(
        { error: "An error occured while updating password" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Password has been reset successfully. Please login with your new password" },
      { status: 200 }
    )
  } catch (error) {
    console.error("An error occured while resetting password:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}

