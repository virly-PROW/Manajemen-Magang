"use client"

import { useRole } from "@/contexts/RoleContext"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function SiteHeader() {
  const { role, setRole } = useRole()
  const router = useRouter()

  const handleRoleChange = (newRole: "siswa" | "guru") => {
    setRole(newRole)
    
    // Navigate to appropriate URL based on role
    if (newRole === "siswa") {
      router.push("/siswa")
    } else {
      router.push("/dashboard")
    }
  }

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
        </div>
      </header>

      {/* Role Switcher */}
      <div className="flex border-b px-4 py-3">
        <div className="inline-flex rounded-md border border-[#dbe7ff] bg-white shadow-sm">
          <button
            onClick={() => handleRoleChange("siswa")}
            className={`px-4 py-1 text-sm font-medium transition-all duration-200 rounded-l-md ${
              role === "siswa"
                ? "bg-[#2f6fed] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-[#eef4ff]"
            }`}
          >
            Siswa
          </button>
          <button
            onClick={() => handleRoleChange("guru")}
            className={`px-4 py-1 text-sm font-medium transition-all duration-200 rounded-r-md border-l border-[#dbe7ff] ${
              role === "guru"
                ? "bg-[#2f6fed] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-[#eef4ff]"
            }`}
          >
            Guru
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-2">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="mt-1 text-slate-600">
          Selamat datang di sistem pelaporan magang siswa SMK Brantas Karangkates
        </p>
      </div>
    </div>
  )
}
