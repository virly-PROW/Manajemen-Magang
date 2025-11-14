
"use client"

import React from "react"
import { useSession } from "next-auth/react"

export function DashboardSiswa() {
  const { data: session } = useSession()
  const userName = session?.user?.name || "Pengguna"

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome Section */}
      <div className="px-6 lg:px-6">
        <div className="rounded-lg bg-white p-6 border">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Selamat datang, {userName}! 
          </h1>
          <p className="text-grey-600">
            Selamat datang di dashboard siswa. Di sini Anda dapat melihat informasi magang dan logbook Anda.
          </p>
        </div>
      </div>
    </div>
  )
}




