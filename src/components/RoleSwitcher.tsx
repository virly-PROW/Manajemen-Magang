"use client" // Directive Next.js: file ini dijalankan di sisi client (bukan server)

import React from "react"
import { useRole } from "@/contexts/RoleContext" // Import custom hook untuk mendapatkan role user dari context

// Definisi tipe props yang bisa diterima oleh komponen RoleSwitcher
// guruContent  -> konten yang ditampilkan kalau role = "guru"
// siswaContent -> konten yang ditampilkan kalau role = "siswa"
interface RoleSwitcherProps {
  guruContent: React.ReactNode
  siswaContent: React.ReactNode
}

// Komponen RoleSwitcher akan menampilkan konten berbeda
// sesuai dengan role yang didapat dari context
export function RoleSwitcher({ guruContent, siswaContent }: RoleSwitcherProps) {
  const { role } = useRole() // Ambil role user dari RoleContext

  // Jika role = "siswa", tampilkan siswaContent
  // Kalau tidak (default: guru), tampilkan guruContent
  return <>{role === "siswa" ? siswaContent : guruContent}</>
}
