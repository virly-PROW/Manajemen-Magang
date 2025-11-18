import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import supabase from "@/lib/supabaseClient"

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPassword, newPassword } = await request.json()

    // Validasi input
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "User ID, current password, dan new password harus diisi" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 }
      )
    }

    // Ambil user dari database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, password_hash, provider")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      )
    }

    // Cek jika user menggunakan provider Google (tidak punya password)
    if (user.provider === "google" && !user.password_hash) {
      // Jika user Google, langsung set password baru tanpa verifikasi password lama
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(newPassword, saltRounds)

      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: passwordHash })
        .eq("id", userId)

      if (updateError) {
        console.error("Error updating password:", updateError)
        return NextResponse.json(
          { error: "Gagal mengubah password" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { message: "Password berhasil diubah" },
        { status: 200 }
      )
    }

    // Verifikasi password lama
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Password saat ini tidak ditemukan" },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Password saat ini salah" },
        { status: 401 }
      )
    }

    // Hash password baru
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json(
        { error: "Gagal mengubah password" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Password berhasil diubah" },
      { status: 200 }
    )
  } catch (error) {
    console.error("An error occurred while changing password:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengubah password" },
      { status: 500 }
    )
  }
}


