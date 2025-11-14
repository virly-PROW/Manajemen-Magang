"use client" // Directive Next.js: file ini dipaksa running di sisi client

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import { usePathname } from "next/navigation"

// Tipe data untuk role user
type Role = "siswa" | "guru"

// Struktur data RoleContext
type RoleContextType = {
  role: Role           // role aktif sekarang
  setRole: (r: Role) => void // fungsi untuk mengganti role
}

// Context untuk menyimpan dan mengakses role
const RoleContext = createContext<RoleContextType | undefined>(undefined)

// Provider untuk membungkus aplikasi agar semua komponen bisa akses role
export function RoleProvider({ children }: { children: ReactNode }) {
  // State role, default "guru"
  // Optional: ambil dari localStorage biar nggak hilang saat reload
  const [role, setRole] = useState<Role>(() => {
    if (typeof window === "undefined") return "guru" // SSR fallback
    return (localStorage.getItem("role") as Role) || "guru"
  })

  // Flag untuk deteksi client-side (hindari hydration mismatch)
  const [isClient, setIsClient] = useState(false)

  // Ambil path aktif dari Next.js
  const pathname = usePathname()

  // Optimasi setRole dengan useCallback untuk mencegah re-render
  const optimizedSetRole = useCallback((newRole: Role) => {
    setRole(newRole)
  }, [])

  // Saat role berubah, simpan ke localStorage
  useEffect(() => {
    setIsClient(true) // tandai sudah client-side
    if (typeof window !== "undefined") {
      localStorage.setItem("role", role)
    }
  }, [role])

  // Sinkronisasi role berdasarkan URL
  // contoh: kalau URL mulai dengan "/siswa" → otomatis set role siswa
  useEffect(() => {
    if (!pathname) return

    if (pathname.startsWith("/siswa") && role !== "siswa") {
      setRole("siswa")
      return
    }
    // Halaman umum seperti /magang, /logbook, /dudi, /dashboard default ke guru
    if ((pathname === "/magang" || pathname === "/logbook" || pathname === "/dudi" || pathname === "/dashboard") && role !== "guru") {
      setRole("guru")
    }
  }, [pathname, role])

  // Kalau masih di SSR → render fallback role guru biar nggak error mismatch
  if (!isClient) {
    return (
      <RoleContext.Provider value={{ role: "guru", setRole }}>
        {children}
      </RoleContext.Provider>
    )
  }

  // Provider utama dengan role yang sudah sinkron
  return (
    <RoleContext.Provider value={{ role, setRole: optimizedSetRole }}>
      {children}
    </RoleContext.Provider>
  )
}

// Custom hook untuk akses role di komponen lain
export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error("useRole must be used within a RoleProvider")
  return ctx
}
