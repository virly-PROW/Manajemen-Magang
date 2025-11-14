import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import supabase from "@/lib/supabaseClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, recaptchaToken } = body

    // Validasi input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, dan name harus diisi" },
        { status: 400 }
      )
    }

    // Verifikasi reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA harus diselesaikan" },
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

    // Cek apakah email sudah terdaftar
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      )
    }

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Insert user baru
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        name,
        provider: "manual",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json(
        { error: "Gagal membuat akun" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Akun berhasil dibuat", user: { id: newUser.id, email: newUser.email, name: newUser.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}


