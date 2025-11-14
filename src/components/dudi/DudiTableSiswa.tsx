"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import supabase from "@/lib/supabaseClient"
import { DudiRegistrationForm } from "./DudiRegistrationForm"

// icons
import { MapPin, User, Mail, Phone, Search } from "lucide-react"

type DudiWithStats = {
  id: number
  perusahaan: string
  alamat: string
  email: string
  no_hp: string
  penanggung_jawab: string
  kuota: number
  jumlah_pendaftar: number
  sisa_kuota: number
  sudah_daftar: boolean
  status?: string
  status_pendaftaran?: string
}

type DudiTableSiswaProps = {
  nisn?: string
}

export function DudiTableSiswa({ nisn }: DudiTableSiswaProps) {
  const [dudiList, setDudiList] = useState<DudiWithStats[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<number | null>(null)
  const [selectedDudi, setSelectedDudi] = useState<{ id: number; name: string } | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Ambil data DUDI + statistik
  const fetchDudiData = async () => {
    setLoading(true)
    try {
      const { data: dudiData, error: dudiError } = await supabase
        .from("dudi")
        .select("*")
        .order("perusahaan")

      if (dudiError) throw dudiError

      const { data: magangData, error: magangError } = await supabase
        .from("magang")
        .select("dudi_id, nisn, status, status_pendaftaran")

      if (magangError) throw magangError

      const dudiWithStats: DudiWithStats[] = dudiData.map((dudi) => {
        const pendaftar = magangData.filter(
          (m) =>
            m.dudi_id === dudi.id &&
            ["menunggu", "diterima"].includes(m.status_pendaftaran || "")
        ).length

        const studentRegistration = magangData.find(
          (m) => m.dudi_id === dudi.id && m.nisn === Number(nisn)
        )

        return {
          ...dudi,
          kuota: dudi.kuota || dudi.siswa_magang || 0,
          jumlah_pendaftar: pendaftar,
          sisa_kuota: Math.max(
            0,
            (dudi.kuota || dudi.siswa_magang || 0) - pendaftar
          ),
          sudah_daftar: !!studentRegistration,
          status: studentRegistration?.status,
          status_pendaftaran: studentRegistration?.status_pendaftaran,
        }
      })

      setDudiList(dudiWithStats)
    } catch (error) {
      console.error("Error fetching DUDI:", (error as any).message || error)
      toast.error("Gagal memuat data DUDI")
    } finally {
      setLoading(false)
    }
  }

  // Load data awal + realtime listener
  useEffect(() => {
    fetchDudiData()

    const channel = supabase
      .channel("dudi-siswa-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dudi" },
        () => fetchDudiData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "magang" },
        () => fetchDudiData()
      )
      .subscribe()

    const handleRegistrationEvent = () => fetchDudiData()
    window.addEventListener("dudi:registration", handleRegistrationEvent)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("dudi:registration", handleRegistrationEvent)
    }
  }, [nisn])

  // Search filter
  const filteredDudi = useMemo(() => {
    if (!search.trim()) return dudiList
    const searchLower = search.toLowerCase()
    return dudiList.filter(
      (dudi) =>
        dudi.perusahaan.toLowerCase().includes(searchLower) ||
        dudi.alamat?.toLowerCase().includes(searchLower) ||
        dudi.penanggung_jawab?.toLowerCase().includes(searchLower)
    )
  }, [dudiList, search])

  // Daftar DUDI - buka form pendaftaran
  const handleRegister = (dudi: DudiWithStats) => {
    if (!nisn) {
      toast.error("NISN tidak ditemukan. Silakan login ulang.")
      return
    }

    // Buka form pendaftaran
    setSelectedDudi({ id: dudi.id, name: dudi.perusahaan })
    setIsFormOpen(true)
  }

  // Batalkan DUDI
  const handleCancel = async (dudiId: number) => {
    if (!nisn) {
      toast.error("NISN tidak ditemukan. Silakan login ulang.")
      return
    }

    setRegistering(dudiId)

    try {
      const { error: deleteError } = await supabase
        .from("magang")
        .delete()
        .eq("dudi_id", Number(dudiId))
        .eq("nisn", Number(nisn))
        .eq("status_pendaftaran", "menunggu")

      if (deleteError) throw deleteError

      toast.success("Pendaftaran berhasil dibatalkan!")
      await fetchDudiData()
      // Beritahu komponen lain agar statistik pending diperbarui
      window.dispatchEvent(new CustomEvent("magang:changed"))
    } catch (error) {
      console.error("Cancel error:", error)
      toast.error("Gagal membatalkan pendaftaran! Silakan coba lagi.")
    } finally {
      setRegistering(null)
    }
  }

  // Badge status
  const getStatusBadge = (dudi: DudiWithStats) => {
    if (!dudi.sudah_daftar) return null

    switch (dudi.status_pendaftaran) {
      case "menunggu":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu</Badge>
      case "diterima":
        return <Badge className="bg-green-100 text-green-800">Diterima</Badge>
      case "ditolak":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
      default:
        return <Badge variant="outline">Tidak Diketahui</Badge>
    }
  }

  const getRegisterButton = (dudi: DudiWithStats) => {
    if (dudi.sudah_daftar) {
      return (
        <div className="space-y-2">
          {getStatusBadge(dudi)}
          {dudi.status_pendaftaran === "menunggu" && (
            <Button
              onClick={() => handleCancel(dudi.id)}
              disabled={registering === dudi.id}
              size="sm"
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50 transition"
            >
              {registering === dudi.id ? "Membatalkan..." : "Batalkan"}
            </Button>
          )}
        </div>
      )
    }

    if (dudi.kuota === 0) {
      return (
        <Button disabled variant="outline" size="sm" className="w-full">
          Kuota Belum Diset
        </Button>
      )
    }

    if (dudi.sisa_kuota <= 0) {
      return (
        <Button disabled variant="outline" size="sm" className="w-full">
          Kuota Penuh
        </Button>
      )
    }

    return (
      <Button
        onClick={() => handleRegister(dudi)}
        size="sm"
        className="w-full bg-sky-500 hover:bg-sky-600 transition text-white"
      >
        Daftar Sekarang
      </Button>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6 max-w-md mx-auto">
        <Input
          placeholder="Cari perusahaan, alamat, penanggung jawab..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-3 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {/* List DUDI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDudi.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 text-lg">
            {search
              ? "Tidak ada DUDI yang sesuai dengan pencarian"
              : "Belum ada DUDI tersedia"}
          </div>
        ) : (
          filteredDudi.map((dudi) => (
            <Card
              key={dudi.id}
              className="border hover:shadow-lg transition-all duration-300 rounded-2xl bg-white shadow-sm"
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  {dudi.perusahaan}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-700">
                  {dudi.alamat && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-sky-600 flex-shrink-6 mt-0.5" /> 
                      <span className="flex-1">{dudi.alamat}</span>
                    </div>
                  )}
                  {dudi.penanggung_jawab && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-sky-600" />{" "}
                      {dudi.penanggung_jawab}
                    </div>
                  )}
                  {dudi.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sky-600" /> {dudi.email}
                    </div>
                  )}
                  {dudi.no_hp && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-sky-600" /> {dudi.no_hp}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Kuota:</span>
                    <Badge className="bg-sky-100 text-sky-800">
                      {dudi.kuota}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Terdaftar:</span>
                    <Badge className="bg-sky-200 text-sky-800">
                      {dudi.jumlah_pendaftar}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sisa:</span>
                    <Badge
                      className={
                        dudi.sisa_kuota > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {dudi.sisa_kuota}
                    </Badge>
                  </div>

                  <div className="pt-3">{getRegisterButton(dudi)}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Pendaftaran */}
      {selectedDudi && nisn && (
        <DudiRegistrationForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          dudiId={selectedDudi.id}
          dudiName={selectedDudi.name}
          nisn={nisn}
          onSuccess={() => {
            fetchDudiData()
            setSelectedDudi(null)
            setIsFormOpen(false)
          }}
        />
      )}
    </div>
  )
}
