"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeaderAccount() {
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
    </div>
  )
}


