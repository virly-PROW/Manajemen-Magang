"use client"

import { useEffect, useState } from "react"
import {
    IconUsers,
    IconBuildingSkyscraper,
    IconSchool,
    IconBook,
  } from "@tabler/icons-react"
  
  import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import supabase from "@/lib/supabaseClient"

type MagangStats = {
  totalSiswa: number
  aktif: number
  selesai: number
  pending: number
}

export function SectionCardsMagang() {
  const [stats, setStats] = useState<MagangStats>({
    totalSiswa: 0,
    aktif: 0,
    selesai: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const [totalRes, aktifRes, selesaiRes, pendingRes] = await Promise.all([
        // Total semua entri magang
        supabase.from("magang").select("id", { count: "exact", head: true }),
        // Status mengikuti yang dipakai di dashboard guru: "berlangsung", "selesai"
        supabase.from("magang").select("id", { count: "exact", head: true }).eq("status", "berlangsung"),
        supabase.from("magang").select("id", { count: "exact", head: true }).eq("status", "selesai"),
        // Pending berdasarkan status_pendaftaran: "menunggu"
        supabase.from("magang").select("id", { count: "exact", head: true }).eq("status_pendaftaran", "menunggu"),
      ])

      setStats({
        totalSiswa: totalRes.count ?? 0,
        aktif: aktifRes.count ?? 0,
        selesai: selesaiRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()

    // Listen custom browser events (manual triggers)
    const handler = () => fetchStats()
    window.addEventListener("magang:changed", handler)
    window.addEventListener("dudi:changed", handler)
    window.addEventListener("dudi:registration", handler)
    window.addEventListener("focus", handler)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchStats()
    })

    // Supabase realtime: auto-refresh on any change to table 'magang'
    const channel = supabase
      .channel("magang-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "magang" },
        () => fetchStats()
      )
      .subscribe()

    return () => {
      window.removeEventListener("magang:changed", handler)
      window.removeEventListener("dudi:changed", handler)
      window.removeEventListener("dudi:registration", handler)
      window.removeEventListener("focus", handler)
      supabase.removeChannel(channel)
    }
  }, [])

  const display = (value: number) => (loading ? "-" : value)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconUsers className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Total Siswa</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.totalSiswa)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Siswa magang terdaftar</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconBuildingSkyscraper className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Aktif</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.aktif)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Sedang magang</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconSchool className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Selesai</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.selesai)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Magang selesai</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconBook className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Pending</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.pending)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Menunggu pendaftaran</div>
        </CardFooter>
      </Card>
    </div>
  )
}
