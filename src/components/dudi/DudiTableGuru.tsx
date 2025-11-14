"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import supabase from "@/lib/supabaseClient"
import { DudiForm } from "./DudiForm"
import { DudiMap } from "./DudiMap"
import { Building, MapPin, User, Mail, Phone, Edit, Trash2, Plus, Search, ChevronLeft, ChevronRight, Map } from "lucide-react"

interface Dudi {
  id: number
  perusahaan: string
  alamat?: string
  penanggung_jawab?: string
  email?: string
  no_hp?: string
  kuota: number
  jumlah_pendaftar: number
  sisa_kuota: number
  latitude?: number
  longitude?: number
}

interface MagangData {
  id: number
  dudi_id: number
  status_pendaftaran: string
}

export function DudiTableGuru() {
  const [dudiList, setDudiList] = useState<Dudi[]>([])
  const [magangData, setMagangData] = useState<MagangData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 5
  const [formOpen, setFormOpen] = useState(false)
  const [editingDudi, setEditingDudi] = useState<Dudi | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, dudi: null as Dudi | null })
  const [mapOpen, setMapOpen] = useState(false)
  const [mapData, setMapData] = useState<Array<{
    id: number
    perusahaan: string
    alamat?: string
    latitude?: number
    longitude?: number
    siswa: Array<{ nama: string; nisn: number }>
    jumlah_siswa: number
  }>>([])

  const fetchDudiData = async () => {
    try {
      setLoading(true)
      
      // Fetch DUDI data
      const { data: dudiData, error: dudiError } = await supabase
        .from("dudi")
        .select("*")
        .order("perusahaan")

      if (dudiError) throw dudiError

      // Fetch magang data to calculate pendaftar
      const { data: magangRows, error: magangError } = await supabase
        .from("magang")
        .select("id, dudi_id, status_pendaftaran")

      if (magangError) throw magangError

      setMagangData(magangRows || [])

      // Calculate pendaftar for each DUDI using the freshly fetched magangRows
      const dudiWithPendaftar = (dudiData || []).map((dudi) => {
        const pendaftar = (magangRows || []).filter(
          (m) => m.dudi_id === dudi.id && 
          (m.status_pendaftaran === "menunggu" || m.status_pendaftaran === "diterima")
        ).length

        return {
          ...dudi,
          jumlah_pendaftar: pendaftar,
          sisa_kuota: dudi.kuota - pendaftar
        }
      })

      setDudiList(dudiWithPendaftar)
    } catch (error) {
      console.error("Error fetching DUDI data:", error)
      toast.error("Gagal memuat data DUDI")
    } finally {
      setLoading(false)
    }
  }

  const filteredDudi = useMemo(() => {
    if (!search) return dudiList
    
    return dudiList.filter((dudi) =>
      dudi.perusahaan.toLowerCase().includes(search.toLowerCase()) ||
      dudi.alamat?.toLowerCase().includes(search.toLowerCase()) ||
      dudi.penanggung_jawab?.toLowerCase().includes(search.toLowerCase())
    )
  }, [dudiList, search])

  const pagedDudi = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredDudi.slice(start, start + pageSize)
  }, [filteredDudi, pageIndex])

  useEffect(() => {
    setPageIndex(0)
  }, [search])

  const handleEdit = (dudi: Dudi) => {
    setEditingDudi(dudi)
    setFormOpen(true)
  }

  const handleDelete = (dudi: Dudi) => {
    setDeleteConfirm({ open: true, dudi })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.dudi) return

    try {
      const { error } = await supabase
        .from("dudi")
        .delete()
        .eq("id", deleteConfirm.dudi.id)

      if (error) throw error

      toast.success("DUDI berhasil dihapus!")
      setDeleteConfirm({ open: false, dudi: null })
      fetchDudiData()
    } catch (error) {
      console.error("Error deleting DUDI:", error)
      toast.error("Gagal menghapus DUDI!")
    }
  }

  // Fetch data untuk peta
  const fetchMapData = async () => {
    try {
      // Fetch semua DUDI dengan koordinat
      const { data: dudiData, error: dudiError } = await supabase
        .from("dudi")
        .select("id, perusahaan, alamat, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)

      if (dudiError) throw dudiError

      // Fetch semua magang yang terdaftar
      const { data: magangData, error: magangError } = await supabase
        .from("magang")
        .select("id, dudi_id, nisn")
        .in("status_pendaftaran", ["menunggu", "diterima"])

      if (magangError) throw magangError

      // Ambil semua NISN yang unik
      const nisnList = Array.from(
        new Set((magangData || []).map((m) => m.nisn).filter(Boolean))
      ) as number[]

      // Fetch data siswa
      let siswaDataMap: Record<number, { nama: string; nisn: number }> = {}
      if (nisnList.length > 0) {
        const { data: siswaData, error: siswaError } = await supabase
          .from("siswa")
          .select("nisn, nama")
          .in("nisn", nisnList)

        if (siswaError) {
          console.error("Error fetching siswa:", siswaError)
        } else {
          siswaDataMap = (siswaData || []).reduce((acc, s) => {
            acc[s.nisn] = { nama: s.nama || "Nama tidak tersedia", nisn: s.nisn }
            return acc
          }, {} as Record<number, { nama: string; nisn: number }>)
        }
      }

      // Group siswa by dudi_id
      const siswaByDudi: Record<number, Array<{ nama: string; nisn: number }>> = {}
      
      if (magangData) {
        magangData.forEach((m) => {
          if (m.dudi_id && m.nisn) {
            if (!siswaByDudi[m.dudi_id]) {
              siswaByDudi[m.dudi_id] = []
            }
            const siswa = siswaDataMap[m.nisn]
            if (siswa) {
              siswaByDudi[m.dudi_id].push(siswa)
            }
          }
        })
      }

      // Map data untuk komponen peta
      const mappedData = (dudiData || []).map((dudi) => ({
        id: dudi.id,
        perusahaan: dudi.perusahaan,
        alamat: dudi.alamat || undefined,
        latitude: dudi.latitude || undefined,
        longitude: dudi.longitude || undefined,
        siswa: siswaByDudi[dudi.id] || [],
        jumlah_siswa: siswaByDudi[dudi.id]?.length || 0,
      }))

      setMapData(mappedData)
    } catch (error) {
      console.error("Error fetching map data:", error)
      toast.error("Gagal memuat data peta")
    }
  }

  const handleOpenMap = () => {
    fetchMapData()
    setMapOpen(true)
  }

  useEffect(() => {
    fetchDudiData()
  }, [])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* DUDI Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar DUDI</h2>
          </div>
          
          {/* Search and Add Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari perusahaan, alamat, penanggung jawab..."
                className="w-full pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleOpenMap}
              >
                <Map className="w-4 h-4 mr-2" />
                Buka Peta
              </Button>
              <Button
                onClick={() => {
                  setEditingDudi(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Dudi
              </Button>
            </div>
          </div>
        </div>

        {filteredDudi.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{search ? "Tidak ada DUDI yang sesuai dengan pencarian" : "Belum ada DUDI tersedia"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perusahaan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontak
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penanggung Jawab
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Siswa Magang
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedDudi.map((dudi) => {
                  const pendaftar = magangData.filter(
                    (m) => m.dudi_id === dudi.id && 
                    (m.status_pendaftaran === "menunggu" || m.status_pendaftaran === "diterima")
                  ).length
                  
                  // Calculate sisa_kuota dynamically to ensure accuracy
                  const sisa_kuota = dudi.kuota - pendaftar

                  return (
                    <tr key={dudi.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {dudi.perusahaan}
                            </div>
                            {dudi.alamat && (
                              <div className="text-sm text-gray-500">
                                {dudi.alamat}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {dudi.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {dudi.email}
                            </div>
                          )}
                          {dudi.no_hp && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {dudi.no_hp}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="w-4 h-4 mr-2" />
                          {dudi.penanggung_jawab || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm">
                            <span className="text-gray-500">Total: </span>
                            <span className="font-medium">{dudi.kuota}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-red-600">Daftar: </span>
                            <span className="font-medium text-red-600">{pendaftar}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600">Sisa: </span>
                            <span className="font-medium text-green-600">{sisa_kuota}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(dudi)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dudi)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
              <div className="text-sm text-gray-600">
                Menampilkan {filteredDudi.length === 0 ? 0 : pageIndex * pageSize + 1}
                -{Math.min(filteredDudi.length, (pageIndex + 1) * pageSize)} dari {filteredDudi.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={pageIndex === 0}
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPageIndex((p) => ((p + 1) * pageSize < filteredDudi.length ? p + 1 : p))}
                  disabled={(pageIndex + 1) * pageSize >= filteredDudi.length}
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DudiForm
          dudi={editingDudi}
          onSuccess={() => {
            setFormOpen(false)
            setEditingDudi(null)
            fetchDudiData()
          }}
          onCancel={() => {
            setFormOpen(false)
            setEditingDudi(null)
          }}
        />
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, dudi: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus DUDI &quot;{deleteConfirm.dudi?.perusahaan}&quot;? 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, dudi: null })}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <DudiMap
        open={mapOpen}
        onOpenChange={setMapOpen}
        dudiData={mapData}
      />
    </div>
  )
}