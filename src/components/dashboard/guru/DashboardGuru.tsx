"use client"
import React, { useState, useEffect } from "react"
import supabase from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Building2,
  BookOpen,
  User,
  Calendar,
  TrendingUp,
  GraduationCap,
} from "lucide-react"

interface SiswaMagang {
  id: number
  nama: string
  kelas: string
  jurusan: string
  dudi_nama: string
  status: string
  periode_mulai: string
  periode_selesai?: string
}

interface LogbookEntry {
  id: number
  nama: string
  tanggal: string
  aktivitas: string
  status: string
}

interface DudiAktif {
  id: number
  perusahaan: string
  jumlah_siswa: number
  sisa_kuota: number
  alamat?: string
  telepon?: string
}

interface DashboardStats {
  totalSiswa: number
  totalDudi: number
  totalLogbook: number
  siswaAktif: number
  logbookHariIni: number
}

export function DashboardGuru() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalDudi: 0,
    totalLogbook: 0,
    siswaAktif: 0,
    logbookHariIni: 0,
  })
  const [siswaMagang, setSiswaMagang] = useState<SiswaMagang[]>([])
  const [logbookTerbaru, setLogbookTerbaru] = useState<LogbookEntry[]>([])
  const [dudiAktif, setDudiAktif] = useState<DudiAktif[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log("🔄 DashboardGuru: Starting fetchDashboardData...")

      // === Fetch Counts ===
      // Total siswa: menghitung dari tabel magang (sama seperti di page magang)
      const { count: totalSiswa, error: siswaError } = await supabase
        .from("magang")
        .select("id", { count: "exact", head: true })

      const { count: totalDudi, error: dudiError } = await supabase
        .from("dudi")
        .select("*", { count: "exact" })

      const { count: totalLogbook, error: logbookError } = await supabase
        .from("logbook")
        .select("*", { count: "exact" })

      if (siswaError) console.error("Error siswa:", siswaError)
      if (dudiError) console.error("Error dudi:", dudiError)
      if (logbookError) console.error("Error logbook:", logbookError)

      // === Fetch Siswa Magang (hanya yang berlangsung) ===
      const { data: magangData, error: magangError } = await supabase
      .from("magang")
      .select(`
        id,
        status,
        periode_mulai,
        periode_selesai,
        siswa:nisn (nama, kelas, jurusan),
        dudi:dudi_id (perusahaan)
      `)
      .eq("status", "berlangsung")
      .order("id", { ascending: false })
      .limit(5)

      if (magangError) console.error("Error magang:", magangError)

      const processedMagang: SiswaMagang[] =
        magangData?.map((item: any) => ({
          id: item.id,
          nama: item.siswa?.nama || "Unknown",
          kelas: item.siswa?.kelas || "",
          jurusan: item.siswa?.jurusan || "",
          dudi_nama: item.dudi?.perusahaan || "Unknown",
          status: item.status,
          periode_mulai: item.periode_mulai,
          periode_selesai: item.periode_selesai,
        })) || []

      // === Fetch DUDI Aktif (4 nama DUDI dari tabel dudi dengan jumlah siswa) ===
      try {
        const { data: dudiData, error: dudiDataError } = await supabase
          .from("dudi")
          .select("*")
          .order("id", { ascending: true })
          .limit(4)

        console.log("🔍 DashboardGuru: DUDI Data fetched:", dudiData)
        console.log("🔍 DashboardGuru: DUDI Error:", dudiDataError)

        if (dudiDataError) {
          console.error("Error dudi data:", dudiDataError)
          setDudiAktif([])
        } else if (!dudiData || dudiData.length === 0) {
          console.log("⚠️ DashboardGuru: No DUDI data found")
          setDudiAktif([])
        } else {
          // Fetch data magang untuk hitung jumlah siswa per DUDI
          const { data: magangData, error: magangDataError } = await supabase
            .from("magang")
            .select("dudi_id")

          if (magangDataError) console.error("Error magang data:", magangDataError)

          // Count jumlah siswa per DUDI (semua status)
          const dudiCountMap: Record<number, number> = {}
          magangData?.forEach((m: any) => {
            if (m.dudi_id) {
              dudiCountMap[m.dudi_id] = (dudiCountMap[m.dudi_id] || 0) + 1
            }
          })

          const processedDudiAktif: DudiAktif[] = dudiData.map((dudi: any) => ({
            id: dudi.id,
            perusahaan: dudi.perusahaan || "Unknown",
            jumlah_siswa: dudiCountMap[dudi.id] || 0,
            sisa_kuota: 0,
            alamat: dudi.alamat || null,
            telepon: dudi.telepon || dudi.no_hp || null,
          }))

          console.log("📊 DashboardGuru: Processed DUDI Aktif:", processedDudiAktif)
          setDudiAktif(processedDudiAktif)
          console.log("✅ DashboardGuru: DUDI Aktif loaded:", processedDudiAktif.length)
        }
      } catch (error) {
        console.error("❌ DashboardGuru: Error fetching DUDI:", error)
        setDudiAktif([])
      }

      // === Fetch Logbook Terbaru ===
      const { data: logbookData, error: logbookDataError } = await supabase
        .from("logbook")
        .select(`
          id,
          tanggal,
          aktivitas,
          status,
          siswa:nisn (nama)
        `)
        .order("id", { ascending: false })
        .limit(4)

      if (logbookDataError) console.error("Error logbook data:", logbookDataError)

      const processedLogbook: LogbookEntry[] =
        logbookData?.map((l: any) => ({
          id: l.id,
          nama: l.siswa?.nama || "Unknown",
          tanggal: l.tanggal,
          aktivitas: l.aktivitas,
          status: l.status,
        })) || []

      // === Stats ===
      // Hitung siswa aktif
      const { count: siswaAktifCount, error: siswaAktifError } = await supabase
        .from("magang")
        .select("id", { count: "exact", head: true })
        .eq("status", "berlangsung")
      
      if (siswaAktifError) console.error("Error siswa aktif:", siswaAktifError)
      const siswaAktif = siswaAktifCount || 0
      
      // Get today's date in multiple formats to ensure compatibility
      const now = new Date()
      const today = now.toISOString().split("T")[0] // YYYY-MM-DD
      const todayLocal = now.toLocaleDateString('en-CA') // YYYY-MM-DD (local timezone)
      
      console.log("📅 DashboardGuru: Today's date formats:", { today, todayLocal })
      
      // Fetch logbook hari ini secara terpisah untuk akurasi
      // Try both date formats to ensure compatibility
      const { count: logbookHariIniCount1, error: logbookTodayError1 } = await supabase
        .from("logbook")
        .select("*", { count: "exact", head: true })
        .eq("tanggal", today)
      
      const { count: logbookHariIniCount2, error: logbookTodayError2 } = await supabase
        .from("logbook")
        .select("*", { count: "exact", head: true })
        .eq("tanggal", todayLocal)
      
      if (logbookTodayError1) console.error("Error logbook hari ini (UTC):", logbookTodayError1)
      if (logbookTodayError2) console.error("Error logbook hari ini (Local):", logbookTodayError2)
      
      const logbookHariIni = Math.max(logbookHariIniCount1 || 0, logbookHariIniCount2 || 0)
      
      // Debug: Check all logbook dates to see what's in the database
      const { data: allLogbooks, error: allLogbooksError } = await supabase
        .from("logbook")
        .select("tanggal")
        .order("id", { ascending: false })
        .limit(10)
      
      if (!allLogbooksError && allLogbooks) {
        console.log("📅 DashboardGuru: Recent logbook dates:", allLogbooks.map(l => l.tanggal))
      }
      
      console.log(`📊 DashboardGuru: Logbook hari ini (${today}): ${logbookHariIni}`)
      console.log(`📊 DashboardGuru: Count 1 (UTC): ${logbookHariIniCount1}, Count 2 (Local): ${logbookHariIniCount2}`)

      const newStats = {
        totalSiswa: totalSiswa || 0,
        totalDudi: totalDudi || 0,
        totalLogbook: totalLogbook || 0,
        siswaAktif,
        logbookHariIni,
      }
      
      console.log("📊 DashboardGuru: Setting new stats:", newStats)
      setStats(newStats)
      setSiswaMagang(processedMagang)
      setLogbookTerbaru(processedLogbook)
      setLastUpdate(new Date())
      
      console.log("✅ DashboardGuru: Data fetch completed successfully")
    } catch (error) {
      console.error("Error dashboard:", error)
    } finally {
      setLoading(false)
      console.log("🏁 DashboardGuru: fetchDashboardData completed")
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const handleUpdate = () => {
      console.log("🔄 DashboardGuru: Received update event, refreshing dashboard...")
      console.log("🔄 DashboardGuru: Current stats before refresh:", stats)
      fetchDashboardData()
    }

    // Set up real-time subscription for logbook changes
    const logbookChannel = supabase
      .channel('dashboard-logbook-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'logbook' }, 
        (payload) => {
          console.log("📡 DashboardGuru: Real-time logbook change detected:", payload)
          console.log("📡 DashboardGuru: Payload event type:", payload.eventType)
          console.log("📡 DashboardGuru: Payload new record:", payload.new)
          fetchDashboardData()
        }
      )
      .subscribe()

    // Polling backup every 30 seconds
    const pollingInterval = setInterval(() => {
      console.log("⏰ DashboardGuru: Polling refresh...")
      fetchDashboardData()
    }, 30000)

    window.addEventListener("magang:changed", handleUpdate)
    window.addEventListener("logbook:updated", handleUpdate)
    window.addEventListener("dudi:registration", handleUpdate)
    
    console.log("🔊 DashboardGuru: Event listeners, real-time subscription, and polling registered")

    return () => {
      supabase.removeChannel(logbookChannel)
      clearInterval(pollingInterval)
      window.removeEventListener("magang:changed", handleUpdate)
      window.removeEventListener("logbook:updated", handleUpdate)
      window.removeEventListener("dudi:registration", handleUpdate)
    }
  }, [])

  // === Helpers ===
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "berlangsung":
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case "selesai":
        return <Badge className="bg-blue-100 text-blue-800">Selesai</Badge>
      case "batal":
        return <Badge className="bg-red-100 text-red-800">Menunggu</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getLogbookStatusBadge = (status: string) => {
    switch (status) {
      case "disetujui":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>
      case "ditolak":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
      case "belum_diverifikasi":
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-gray-200"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      {/* === Summary Cards === */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Siswa" value={stats.totalSiswa} icon={<Users className="h-6 w-6 text-blue-600" />} color="bg-blue-100" />
        <SummaryCard label="DUDI Partner" value={stats.totalDudi} icon={<Building2 className="h-6 w-6 text-green-600" />} color="bg-green-100" />
        <SummaryCard label="Siswa Magang" value={stats.siswaAktif} icon={<Calendar className="h-6 w-6 text-orange-600" />} color="bg-orange-100" />
        <SummaryCard 
          label="Logbook Hari Ini" 
          value={stats.logbookHariIni} 
          icon={<BookOpen className="h-6 w-6 text-purple-600" />} 
          color="bg-purple-100"
        />
      </div>

      {/* === Two Column Layout === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4">
          {/* === Magang Terbaru === */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-gray-600" />
                Magang Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {siswaMagang.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada siswa magang yang berlangsung
                  </p>
                ) : (
                  siswaMagang.map((siswa) => (
                    <div key={siswa.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{siswa.nama}</p>
                        <p className="text-sm text-gray-600">{siswa.dudi_nama}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(siswa.periode_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })} - {siswa.periode_selesai ? new Date(siswa.periode_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '-'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {getStatusBadge(siswa.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* === Logbook Terbaru === */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-600" />
                Logbook Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logbookTerbaru.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada logbook
                  </p>
                ) : (
                  logbookTerbaru.map((logbook) => (
                    <div key={logbook.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 mb-1 line-clamp-2">{logbook.aktivitas}</p>
                          <p className="text-xs text-gray-500 mb-2">
                            {new Date(logbook.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2">
                            {getLogbookStatusBadge(logbook.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* === Progress Overview === */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProgressItem 
                label="Siswa Aktif Magang" 
                value={stats.siswaAktif} 
                total={stats.totalSiswa || 1} 
              />
              <ProgressItem 
                label="Logbook Hari Ini" 
                value={stats.logbookHariIni} 
                total={stats.siswaAktif || 1} 
              />
            </CardContent>
          </Card>

          {/* === DUDI Aktif === */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                DUDI Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dudiAktif.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada DUDI
                  </p>
                ) : (
                  dudiAktif.map((dudi) => (
                    <div key={dudi.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-900">{dudi.perusahaan}</p>
                            {dudi.jumlah_siswa > 0 && (
                              <Badge className="bg-green-100 text-green-800 shrink-0">
                                {dudi.jumlah_siswa} siswa
                              </Badge>
                            )}
                          </div>
                          {dudi.alamat && (
                            <p className="text-sm text-gray-600 mb-1">{dudi.alamat}</p>
                          )}
                          {dudi.telepon && (
                            <p className="text-sm text-gray-600">{dudi.telepon}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* === Small Components for Clean Code === */
const SummaryCard = ({ label, value, icon, color, onRefresh }: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  onRefresh?: () => void;
}) => (
  <Card className="relative border-[#dbe7ff] h-full flex flex-col">
    <CardContent className="p-5 flex items-center justify-between flex-1 min-h-0">
      <div className="flex flex-col justify-between flex-1 min-h-0">
        <div className="min-h-[2rem] flex items-start w-full pr-2">
          <p className="text-sm font-medium text-slate-600 line-clamp-2 break-words w-full max-w-[calc(100%-3rem)]">{label}</p>
        </div>
        <p className="text-3xl font-bold text-slate-900 mt-auto">{value}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color} shrink-0`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
)

const ProgressItem = ({ label, value, total }: { label: string; value: number; total: number }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-500">{value}/{total}</span>
    </div>
    <Progress value={total > 0 ? (value / total) * 100 : 0} className="h-2 bg-[#eaf1ff] [&>div]:bg-[#2f6fed]" />
  </div>
)
