"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconUser, IconBuilding, IconCalendar, IconMapPin } from "@tabler/icons-react"
import { useSession } from "next-auth/react"
import supabase from "@/lib/supabaseClient"

type MagangData = {
  id: number
  nisn: number
  dudi_id: number | null
  dudi?: { perusahaan: string; alamat: string | null } | null
  siswa?: {
    nisn: number
    nama: string | null
    kelas: string | null
    jurusan: string | null
    email: string | null
    no_hp: string | null
    alamat: string | null
  } | null
  periode_mulai: string | null
  periode_selesai: string | null
  nilai: number | null
  status: string | null
  status_pendaftaran: string | null
  jenis_kelamin: string | null
}

export function MagangSiswa() {
  const [magangData, setMagangData] = useState<MagangData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  const fetchMagangData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Ambil email user yang login dari NextAuth
      if (status === "loading") {
        console.log("⏳ Session masih loading...")
        setLoading(false)
        return
      }

      if (status === "unauthenticated" || !session?.user?.email) {
        console.error("❌ User tidak terautentikasi atau email tidak ditemukan")
        console.log("Session status:", status)
        console.log("Session data:", session)
        setMagangData(null)
        setLoading(false)
        return
      }

      const userEmailOriginal = session.user.email
      const userEmail = userEmailOriginal.toLowerCase().trim()
      console.log("✅ User email from NextAuth (original):", userEmailOriginal)
      console.log("✅ User email from NextAuth (normalized):", userEmail)

      // Ambil semua data siswa untuk debugging dan matching
      const { data: allSiswa, error: allSiswaError } = await supabase
        .from("siswa")
        .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
      
      console.log("🔍 Semua data siswa di database:", allSiswa)
      console.log("📧 Email yang dicari:", userEmail)
      
      if (allSiswa) {
        console.log("📋 Daftar email di database:")
        allSiswa.forEach((s, idx) => {
          const dbEmail = s.email ? s.email.toLowerCase().trim() : null
          const match = dbEmail === userEmail ? "✅ MATCH!" : "❌"
          console.log(`${idx + 1}. ${match} "${s.email}" (normalized: "${dbEmail}")`)
        })
      }

      // Cek di tabel siswa apakah ada data dengan email yang sama
      // Coba multiple methods untuk memastikan match
      let siswaData = null
      let siswaError = null
      
      // Method 1: Exact match dengan eq (normalized)
      const { data: siswaData1, error: error1 } = await supabase
        .from("siswa")
        .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
        .eq("email", userEmail)
        .maybeSingle()
      
      if (siswaData1 && !error1) {
        siswaData = siswaData1
        console.log("✅ Found dengan eq (normalized):", siswaData)
      } else {
        // Method 1b: Exact match dengan eq (original)
        const { data: siswaData1b, error: error1b } = await supabase
          .from("siswa")
          .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
          .eq("email", userEmailOriginal)
          .maybeSingle()
        
        if (siswaData1b && !error1b) {
          siswaData = siswaData1b
          console.log("✅ Found dengan eq (original):", siswaData)
        } else {
          // Method 2: Case-insensitive dengan ilike
          const { data: siswaData2, error: error2 } = await supabase
            .from("siswa")
            .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
            .ilike("email", userEmail)
            .maybeSingle()
          
          if (siswaData2 && !error2) {
            siswaData = siswaData2
            console.log("✅ Found dengan ilike (case-insensitive):", siswaData)
          } else {
            // Method 3: Manual filter dari allSiswa (coba normalized dan original)
            if (allSiswa && !allSiswaError) {
              const matched = allSiswa.find(s => {
                if (!s.email) return false
                const dbEmailNormalized = s.email.toLowerCase().trim()
                const dbEmailOriginal = s.email.trim()
                // Coba match dengan normalized
                if (dbEmailNormalized === userEmail) return true
                // Coba match dengan original
                if (dbEmailOriginal === userEmailOriginal) return true
                // Coba match dengan original normalized
                if (dbEmailNormalized === userEmailOriginal.toLowerCase().trim()) return true
                return false
              })
              if (matched) {
                siswaData = matched
                console.log("✅ Found dengan manual filter:", siswaData)
              } else {
                console.log("❌ Tidak ada match dengan semua metode")
              }
            }
            siswaError = error2 || allSiswaError
          }
        }
      }

      console.log("📊 Hasil query siswa final:", siswaData)
      console.log("⚠️ Error query siswa:", siswaError)

      if (siswaError) {
        console.error("❌ Error fetching siswa data:", siswaError)
        setMagangData(null)
        setLoading(false)
        return
      }

      // Jika tidak ada data siswa dengan email tersebut
      if (!siswaData || !siswaData.nisn) {
        console.log("⚠️ Tidak ada data siswa dengan email:", userEmail)
        setMagangData(null)
        setLoading(false)
        return
      }

      console.log("✅ Data siswa ditemukan:", {
        nisn: siswaData.nisn,
        nama: siswaData.nama,
        email: siswaData.email
      })

      // Jika ada, ambil data magang berdasarkan NISN siswa tersebut
      const { data: magangRow, error: magangError } = await supabase
        .from("magang")
        .select("*, dudi:dudi_id(perusahaan, alamat)")
        .eq("nisn", siswaData.nisn)
        .order("id", { ascending: false })
        .maybeSingle()

      console.log("🔍 Query magang dengan NISN:", siswaData.nisn)
      console.log("📊 Hasil query magang:", magangRow)
      console.log("⚠️ Error query magang:", magangError)

      if (magangError) {
        console.error("❌ Error fetching magang data:", magangError)
        setMagangData(null)
        setLoading(false)
        return
      }

      // Jika ada data magang, tampilkan
      if (magangRow) {
        console.log("✅ Data magang ditemukan, menampilkan data")
        setMagangData({
          ...magangRow,
          siswa: siswaData
        } as MagangData)
      } else {
        // Jika tidak ada data magang
        console.log("⚠️ Tidak ada data magang untuk NISN:", siswaData.nisn)
        setMagangData(null)
      }
    } catch (error) {
      console.error("❌ Error fetching magang data:", error)
      setMagangData(null)
    } finally {
      setLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    // Tunggu sampai session ready
    if (status === "loading") {
      return
    }
    
    if (status === "authenticated" && session?.user?.email) {
      fetchMagangData()
    }

    // Event listeners untuk update manual
    const handleMagangChanged = () => {
      console.log('🔄 Event: magang:changed triggered')
      setTimeout(() => {
        fetchMagangData()
      }, 500)
    }
    const handleDudiChanged = () => {
      console.log('🔄 Event: dudi:changed triggered')
      setTimeout(() => {
        fetchMagangData()
      }, 500)
    }
    window.addEventListener("magang:changed", handleMagangChanged)
    window.addEventListener("dudi:changed", handleDudiChanged)

    // Listen to NextAuth session changes via window events
    const handleSessionChange = () => {
      console.log('🔄 Session changed, refetching data...')
      if (status === "authenticated" && session?.user?.email) {
        fetchMagangData()
      }
    }
    
    // Listen for custom events that might indicate session changes
    window.addEventListener("session:changed", handleSessionChange)

    // Supabase Realtime untuk update otomatis
    const channel = supabase
      .channel('magang-siswa-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'magang' 
        }, 
        (payload) => {
          console.log('🔄 Realtime: Magang changed:', payload)
          // Delay sedikit untuk memastikan data sudah ter-update di database
          setTimeout(() => {
            fetchMagangData()
          }, 500)
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'siswa' 
        }, 
        (payload) => {
          console.log('🔄 Realtime: Siswa data changed:', payload)
          // Delay sedikit untuk memastikan data sudah ter-update di database
          setTimeout(() => {
            fetchMagangData()
          }, 500)
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'dudi' 
        }, 
        (payload) => {
          console.log('🔄 Realtime: DUDI data changed:', payload)
          // Delay sedikit untuk memastikan data sudah ter-update di database
          setTimeout(() => {
            fetchMagangData()
          }, 500)
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
      })

    // Polling backup setiap 30 detik
    const pollingInterval = setInterval(() => {
      fetchMagangData()
    }, 30000)

    return () => {
      window.removeEventListener("magang:changed", handleMagangChanged)
      window.removeEventListener("dudi:changed", handleMagangChanged)
      window.removeEventListener("session:changed", handleSessionChange)
      supabase.removeChannel(channel)
      clearInterval(pollingInterval)
    }
  }, [fetchMagangData, status, session])

  if (loading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border p-6">
          <p className="text-muted-foreground">Memuat data magang...</p>
        </div>
      </div>
    )
  }

  if (!magangData) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Status Magang Saya</h2>
          <p className="text-muted-foreground">
            Belum ada data magang.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-1 lg:px-4">
      <div className="mb-2">

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Data Magang Siswa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-500">Nama Siswa</label>
                <p className="text-sm font-semibold">{magangData.siswa?.nama || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">NISN</label>
                <p className="text-sm font-semibold">{magangData.siswa?.nisn || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Kelas</label>
                <p className="text-sm font-semibold">{magangData.siswa?.kelas || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Jurusan</label>
                <p className="text-sm font-semibold">{magangData.siswa?.jurusan || "-"}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <IconBuilding className="h-4 w-4" />
                  Nama Perusahaan
                </label>
                <p className="text-sm font-semibold">{magangData.dudi?.perusahaan || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <IconMapPin className="h-4 w-4" />
                  Alamat Perusahaan
                </label>
                <p className="text-sm font-semibold">{magangData.dudi?.alamat || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <IconCalendar className="h-4 w-4" />
                  Periode Magang
                </label>
                <p className="text-sm font-semibold">
                  {magangData.periode_mulai ? new Date(magangData.periode_mulai).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  }) : "-"} s.d {magangData.periode_selesai ? new Date(magangData.periode_selesai).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  }) : "-"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant="default"
                      className={
                        magangData.status === "Berlangsung" || magangData.status === "berlangsung"
                          ? "bg-blue-100 text-blue-800" 
                          : magangData.status === "Selesai" || magangData.status === "selesai"
                          ? "bg-green-100 text-green-800"
                          : magangData.status === "Batal" || magangData.status === "batal"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {magangData.status ? 
                        magangData.status.charAt(0).toUpperCase() + magangData.status.slice(1).toLowerCase() 
                        : "-"
                      }
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nilai Akhir</label>
                  <p className="text-sm font-semibold">
                    {magangData.nilai ? magangData.nilai : (
                      <span className="text-grey-400">Belum ada</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}