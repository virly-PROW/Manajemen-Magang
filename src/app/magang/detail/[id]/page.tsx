"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconUser, IconBuilding, IconCalendar, IconMapPin } from "@tabler/icons-react"
import supabase from "@/lib/supabaseClient"

// Force dynamic rendering untuk production build
export const dynamic = 'force-dynamic'
export const dynamicParams = true

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
}

export default function MagangDetailPage() {
  const params = useParams()
  const magangId = params?.id as string
  const [magangData, setMagangData] = useState<MagangData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (magangId) {
      fetchMagangData()
    }
  }, [magangId])

  const fetchMagangData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch magang data with dudi
      const { data: magangRow, error: magangError } = await supabase
        .from("magang")
        .select("id, nisn, dudi_id, periode_mulai, periode_selesai, nilai, status, status_pendaftaran")
        .eq("id", parseInt(magangId))
        .single()

      if (magangError) {
        console.error("Error fetching magang:", magangError)
        setError("Data magang tidak ditemukan")
        return
      }

      if (!magangRow) {
        setError("Data magang tidak ditemukan")
        return
      }

      // Fetch dudi data
      let dudiData = null
      if (magangRow.dudi_id) {
        const { data: dudiRow, error: dudiError } = await supabase
          .from("dudi")
          .select("id, perusahaan, alamat")
          .eq("id", magangRow.dudi_id)
          .single()

        if (!dudiError && dudiRow) {
          dudiData = dudiRow
        }
      }

      // Fetch siswa data
      let siswaData = null
      if (magangRow.nisn) {
        const { data: siswaRow, error: siswaError } = await supabase
          .from("siswa")
          .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
          .eq("nisn", magangRow.nisn)
          .single()

        if (!siswaError && siswaRow) {
          siswaData = siswaRow
        }
      }

      setMagangData({
        ...magangRow,
        dudi: dudiData,
        siswa: siswaData
      } as MagangData)

    } catch (error) {
      console.error("Error fetching magang data:", error)
      setError("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data magang...</p>
        </div>
      </div>
    )
  }

  if (error || !magangData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error || "Data magang tidak ditemukan"}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const statusText = magangData.status === 'selesai' ? 'Selesai' :
                    magangData.status === 'berlangsung' ? 'Berlangsung' :
                    magangData.status === 'batal' ? 'Batal' : '-'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Magang Siswa</h1>
          <p className="text-gray-600">Detail informasi magang siswa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              Data Magang Siswa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Siswa</label>
                  <p className="text-sm font-semibold mt-1">{magangData.siswa?.nama || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">NISN</label>
                  <p className="text-sm font-semibold mt-1">{magangData.siswa?.nisn || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kelas</label>
                  <p className="text-sm font-semibold mt-1">{magangData.siswa?.kelas || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Jurusan</label>
                  <p className="text-sm font-semibold mt-1">{magangData.siswa?.jurusan || "-"}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <IconBuilding className="h-4 w-4" />
                    Nama Perusahaan
                  </label>
                  <p className="text-sm font-semibold mt-1">{magangData.dudi?.perusahaan || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <IconMapPin className="h-4 w-4" />
                    Alamat Perusahaan
                  </label>
                  <p className="text-sm font-semibold mt-1">{magangData.dudi?.alamat || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <IconCalendar className="h-4 w-4" />
                    Periode Magang
                  </label>
                  <p className="text-sm font-semibold mt-1">
                    {formatDate(magangData.periode_mulai)} s.d {formatDate(magangData.periode_selesai)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant="default"
                        className={
                          magangData.status === "berlangsung"
                            ? "bg-blue-100 text-blue-800" 
                            : magangData.status === "selesai"
                            ? "bg-green-100 text-green-800"
                            : magangData.status === "batal"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nilai Akhir</label>
                    <p className="text-sm font-semibold mt-1">
                      {magangData.nilai ? magangData.nilai : (
                        <span className="text-gray-400">Belum ada</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



