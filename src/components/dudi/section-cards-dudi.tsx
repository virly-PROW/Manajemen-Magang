import { useEffect, useState } from "react"
import { IconBuildingSkyscraper, IconSchool, IconUsers, IconUserCheck } from "@tabler/icons-react"

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import supabase from "@/lib/supabaseClient"

type DudiStats = {
  totalDudi: number
  totalKuota: number
  totalPendaftar: number
  sisaKuota: number
}

export function SectionCardsDudi() {
  const [stats, setStats] = useState<DudiStats>({ totalDudi: 0, totalKuota: 0, totalPendaftar: 0, sisaKuota: 0 })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const [dudiRes, magangRes] = await Promise.all([
          supabase.from("dudi").select("id, kuota, siswa_magang"),
          supabase
            .from("magang")
            .select("dudi_id, status_pendaftaran")
            .in("status_pendaftaran", ["menunggu", "diterima"])
        ])

        const totalDudi = dudiRes.data?.length ?? 0
        const totalKuota = dudiRes.data?.reduce((sum, dudi) => sum + (dudi.kuota || dudi.siswa_magang || 0), 0) ?? 0
        const totalPendaftar = magangRes.data?.length ?? 0
        const sisaKuota = Math.max(0, totalKuota - totalPendaftar)

        setStats({ totalDudi, totalKuota, totalPendaftar, sisaKuota })
      } catch (error) {
        console.error("Error fetching DUDI stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Event listeners untuk update manual
    const handler = () => fetchStats()
    window.addEventListener("magang:changed", handler)
    window.addEventListener("dudi:changed", handler)
    window.addEventListener("dudi:registration", handler)

    // Supabase Realtime untuk update otomatis
    const channel = supabase
      .channel('dudi-stats-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'magang' 
        }, 
        (payload) => {
          console.log('DUDI stats changed (magang):', payload)
          fetchStats()
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'dudi' 
        }, 
        (payload) => {
          console.log('DUDI stats changed (dudi):', payload)
          fetchStats()
        }
      )
      .subscribe()

    // Polling backup setiap 30 detik
    const pollingInterval = setInterval(() => {
      fetchStats()
    }, 30000)

    return () => {
      window.removeEventListener("magang:changed", handler)
      window.removeEventListener("dudi:changed", handler)
      window.removeEventListener("dudi:registration", handler)
      supabase.removeChannel(channel)
      clearInterval(pollingInterval)
    }
  }, [])

  const display = (v: number) => (loading ? "-" : v)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconBuildingSkyscraper className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Total DUDI</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.totalDudi)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Perusahaan Mitra</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconUsers className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Total Kuota</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.totalKuota)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Slot Tersedia</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconUserCheck className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Total Pendaftar</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.totalPendaftar)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Siswa Terdaftar</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconSchool className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Sisa Kuota</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            {display(stats.sisaKuota)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Slot Kosong</div>
        </CardFooter>
      </Card>
    </div>
  )
}

