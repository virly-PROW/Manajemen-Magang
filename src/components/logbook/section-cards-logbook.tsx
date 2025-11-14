"use client"

import React, { useState, useEffect } from "react"
import supabase from "@/lib/supabaseClient"
import {
  IconUsers,
  IconBuildingSkyscraper,
} from "@tabler/icons-react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface LogbookStats {
  total: number
  total_siswa: number
}

export function SectionCardsLogbook() {
  const [stats, setStats] = useState<LogbookStats>({
    total: 0,
    total_siswa: 0,
  })
  const [loading, setLoading] = useState(true)

  // ✅ supabase client instance (already initialized)

  // Fetch logbook statistics
  const fetchStats = async () => {
    try {
      setLoading(true)

      // Total logbooks
      const { count: total, error: totalError } = await supabase
        .from("logbook")
        .select("*", { count: "exact", head: true })
      if (totalError) throw totalError

      // Total siswa (distinct NISN)
      const { count: totalSiswa, error: totalSiswaError } = await supabase
        .from("logbook")
        .select("nisn", { count: "exact", head: true })
      if (totalSiswaError) throw totalSiswaError

      setStats({
        total: total || 0,
        total_siswa: totalSiswa || 0,
      })
    } catch (error: any) {
      console.error("Error fetching logbook stats:", error.message || error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // 🔄 Real-time subscription
    const logbookSubscription = supabase
      .channel("logbook_stats_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logbook" },
        (payload) => {
          console.log("Logbook stats change detected:", payload)
          fetchStats()
        }
      )
      .subscribe()

    // ⏳ Polling sebagai backup
    const interval = setInterval(() => {
      console.log("Polling logbook stats...")
      fetchStats()
    }, 60000)

    // 📢 Listener custom event
    const handleLogbookChange = () => {
      console.log("📥 SectionCardsLogbook: Received logbook:changed event, refreshing...")
      fetchStats()
    }
    window.addEventListener("logbook:changed", handleLogbookChange)
    window.addEventListener("logbook:updated", handleLogbookChange)

    return () => {
      logbookSubscription.unsubscribe()
      clearInterval(interval)
      window.removeEventListener("logbook:changed", handleLogbookChange)
      window.removeEventListener("logbook:updated", handleLogbookChange)
    }
  }, [])

  if (loading) {
    // Skeleton UI saat loading
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader className="flex flex-col items-start space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardFooter>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2">
      {/* Total Logbook */}
      <Card className="@container/card">
        <CardHeader className="flex flex-col items-start space-y-2">
          <div className="flex items-center gap-2">
            <IconUsers className="h-6 w-6 text-blue-500" />
            <CardDescription>Total Logbook</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
            {stats.total}
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <div className="text-muted-foreground">
            Laporan harian terdaftar
          </div>
        </CardFooter>
      </Card>

      {/* Total Siswa */}
      <Card className="@container/card">
        <CardHeader className="flex flex-col items-start space-y-2">
          <div className="flex items-center gap-2">
            <IconBuildingSkyscraper className="h-6 w-6 text-blue-500" />
            <CardDescription>Total Siswa</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
            {stats.total_siswa}
          </CardTitle>
        </CardHeader>
        <CardFooter>
          <div className="text-muted-foreground">
            Memiliki logbook
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
