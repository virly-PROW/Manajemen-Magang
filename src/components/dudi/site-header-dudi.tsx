"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRole } from "@/contexts/RoleContext"

export function SiteHeaderDudi() {
  const { role, setRole } = useRole()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Broadcast role change to other components
    window.dispatchEvent(new CustomEvent("role:change", { detail: role }))
  }, [role])

  return (
    <div className="w-full">
      {/* Header Atas */}
      <header className="flex h-auto flex-col border-b px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <div>
            <h1 className="text-base font-semibold">
              SMK Brantas Karangkates
            </h1>
            <p className="text-xs text-slate-500">
              Sistem Pelaporan Magang Siswa
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
          </div>
        </div>
      </header>

      {/* Role Switcher */}
      <div className="flex px-4 py-3 border-b">
        <div className="inline-flex rounded-md border border-[#dbe7ff] bg-white shadow-sm">
          <button
            onClick={() => {
              setRole("siswa")
              // Small delay to ensure state is updated before navigation
              setTimeout(() => {
                if (pathname !== "/siswa/dudi") router.push("/siswa/dudi")
              }, 50)
            }}
            className={`px-4 py-1 text-sm font-medium transition-all duration-200 rounded-l-md ${
              (role === "siswa" && pathname === "/siswa/dudi") || pathname === "/siswa/dudi"
                ? "bg-[#2f6fed] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-[#eef4ff]"
            }`}
          >
            Siswa
          </button>
          <button
            onClick={() => {
              setRole("guru")
              // Small delay to ensure state is updated before navigation
              setTimeout(() => {
                if (pathname !== "/dudi") router.push("/dudi")
              }, 50)
            }}
            className={`px-4 py-1 text-sm font-medium transition-all duration-200 rounded-r-md border-l border-[#dbe7ff] ${
              (role === "guru" && pathname === "/dudi") || pathname === "/dudi"
                ? "bg-[#2f6fed] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-[#eef4ff]"
            }`}
          >
            Guru
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <h2 className="text-2xl font-bold">DUDI</h2>
        <p className="text-slate-600 mt-1">
          Kelola data industri dan perusahaan mitra magang siswa
        </p>
      </div>
    </div>
  )
}
