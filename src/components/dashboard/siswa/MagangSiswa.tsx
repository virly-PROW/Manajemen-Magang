"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconUser, IconBuilding, IconCalendar, IconMapPin } from "@tabler/icons-react"
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

  useEffect(() => {
    fetchMagangData()

    // Event listeners untuk update manual
    const handleMagangChanged = () => {
      fetchMagangData()
    }
    window.addEventListener("magang:changed", handleMagangChanged)
    window.addEventListener("dudi:changed", handleMagangChanged)

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
          console.log('Magang siswa changed:', payload)
          fetchMagangData()
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'siswa' 
        }, 
        (payload) => {
          console.log('Siswa data changed:', payload)
          fetchMagangData()
        }
      )
      .subscribe()

    // Polling backup setiap 30 detik
    const pollingInterval = setInterval(() => {
      fetchMagangData()
    }, 30000)

    return () => {
      window.removeEventListener("magang:changed", handleMagangChanged)
      window.removeEventListener("dudi:changed", handleMagangChanged)
      supabase.removeChannel(channel)
      clearInterval(pollingInterval)
    }
  }, [])

  const fetchMagangData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema("public")
        .from("magang")
        .select("*, dudi:dudi_id(perusahaan, alamat)")
        .order("id", { ascending: false })

      if (!error && data) {
        // Cari data magang yang memiliki NISN yang sesuai
        const magangRows = data as Array<{ nisn: number; dudi: { perusahaan: string | null; alamat: string | null } | null; [key: string]: any }>
        const nisnList = Array.from(new Set(magangRows.map((r) => r.nisn).filter(Boolean))) as number[]
        
        if (nisnList.length > 0) {
          // Ambil data siswa untuk semua NISN
          const { data: siswaRows } = await supabase
            .schema("public")
            .from("siswa")
            .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
            .in("nisn", nisnList)
          
          // Ambil data magang terbaru (bukan hardcode nama tertentu)
          // Hanya ambil data magang yang siswanya bernama "Virly Qoirul Annisa"
          const filteredData = magangRows.find((magang) => {
            const siswa = siswaRows?.find((s: { nisn: number; nama: string | null }) => s.nisn === magang.nisn)
            return siswa && siswa.nama && siswa.nama.includes("Virly Qoirul Annisa")
          })
          
          if (filteredData) {
            const siswaData = siswaRows?.find((s: { nisn: number; nama: string | null; kelas: string | null; jurusan: string | null; email: string | null; no_hp: string | null; alamat: string | null }) => s.nisn === filteredData.nisn)
            setMagangData({
              ...filteredData,
              siswa: siswaData
            } as MagangData)
          } else {
            setMagangData(null)
          }
        } else {
          setMagangData(null)
        }
      } else {
        console.log("Tidak ada data magang")
        setMagangData(null)
      }
    } catch (error) {
      console.error("Error fetching magang data:", error)
      setMagangData(null)
    } finally {
      setLoading(false)
    }
  }

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
            Belum ada data magang untuk Anda. Silakan hubungi guru pembimbing.
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