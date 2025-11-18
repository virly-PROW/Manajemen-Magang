"use client"

import React, { useState, useEffect, useRef } from "react"
import supabase from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, CheckCircle, XCircle, Clock, Edit, MessageSquare, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createNotificationClient } from "@/lib/notificationClient"
import { TableSkeleton } from "@/components/skeletons/PageSkeleton"

interface LogbookEntry {
  id: number
  tanggal: string
  aktivitas: string
  kendala?: string
  nisn: number
  status: "belum_diverifikasi" | "disetujui" | "ditolak"
  komentar_pembimbing?: string
  created_at?: string
  foto_url?: string
  siswa?: {
    nama?: string
    kelas?: string
    jurusan?: string
  }
}

export function LogbookGuru() {
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")
  const [viewingLogbook, setViewingLogbook] = useState<LogbookEntry | null>(null)
  const [fullMediaUrl, setFullMediaUrl] = useState<string | null>(null)
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false)
  const pageSize = 10
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)


  const [form, setForm] = useState({
    status: "",
    komentar_pembimbing: "",
  })
  const statusSelectRef = useRef<HTMLButtonElement>(null)

  // Fetch logbook data (first page)
  const fetchLogbooks = async () => {
    try {
      setLoading(true)
      console.log("Starting to fetch logbooks...")

      // First check if logbook table exists by trying to fetch count
      const { count: logbookCount, error: countError } = await supabase
        .from("logbook")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.error("Error checking logbook table:", countError)
        toast.error("Tabel logbook tidak ditemukan. Silakan hubungi administrator.")
        return
      }

      console.log("Logbook table exists, count:", logbookCount)

      // Fetch first page of logbooks
      let logbookData: any[] | null = null
      let logbookError: any = null
      try {
        const res = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing, foto_url")
          .order("id", { ascending: false })
          .range(0, pageSize - 1)
        logbookData = res.data
        logbookError = res.error
      } catch (e) {
        logbookError = e
      }
      if (logbookError && String(logbookError?.message || logbookError).includes("foto_url")) {
        const res2 = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing")
          .order("id", { ascending: false })
          .range(0, pageSize - 1)
        logbookData = res2.data
        logbookError = res2.error
      }

      if (logbookError) {
        console.error("Error fetching logbooks:", logbookError)
        toast.error(`Gagal memuat data logbook: ${logbookError.message}`)
        return
      }

      console.log("Fetched logbooks:", logbookData?.length || 0)

      if (!logbookData || logbookData.length === 0) {
        console.log("No logbook data found")
        setLogbooks([])
        return
      }

      // Get unique NISN values
      const nisnList = [...new Set(logbookData.map(l => l.nisn).filter(Boolean))]
      console.log("NISN list:", nisnList)
      
      if (nisnList.length === 0) {
        console.log("No valid NISN found in logbooks")
        setLogbooks([])
        return
      }

      // Fetch siswa data for all NISN
      const { data: siswaData, error: siswaError } = await supabase
        .from("siswa")
        .select("nisn, nama, kelas, jurusan")
        .in("nisn", nisnList)

      if (siswaError) {
        console.error("Error fetching siswa data:", siswaError)
        toast.error(`Gagal memuat data siswa: ${siswaError.message}`)
        return
      }

      console.log("Fetched siswa data:", siswaData?.length || 0)

      // Merge logbook and siswa data
      const mergedData = logbookData.map(logbook => {
        const siswa = siswaData?.find(s => s.nisn === logbook.nisn)
        return {
          ...logbook,
          siswa: siswa || { nama: "Unknown", kelas: "", jurusan: "" }
        }
      })

      console.log("Merged data:", mergedData.length)
      setLogbooks(mergedData)
      setHasMore((logbookData || []).length === pageSize)
    } catch (error) {
      console.error("Unexpected error in fetchLogbooks:", error)
      toast.error("Terjadi kesalahan yang tidak terduga")
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const start = logbooks.length
      const end = start + pageSize - 1
      let moreLogbooks: any[] | null = null
      let logbookError: any = null
      try {
        const res = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing, foto_url")
          .order("id", { ascending: false })
          .range(start, end)
        moreLogbooks = res.data
        logbookError = res.error
      } catch (e) {
        logbookError = e
      }
      if (logbookError && String(logbookError?.message || logbookError).includes("foto_url")) {
        const res2 = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing")
          .order("id", { ascending: false })
          .range(start, end)
        moreLogbooks = res2.data
        logbookError = res2.error
      }
      if (logbookError) throw logbookError

      const nisnList = [...new Set((moreLogbooks || []).map(l => l.nisn).filter(Boolean))]
      const { data: siswaData } = await supabase
        .from("siswa")
        .select("nisn, nama, kelas, jurusan")
        .in("nisn", nisnList)

      const merged = (moreLogbooks || []).map(logbook => {
        const siswa = siswaData?.find(s => s.nisn === logbook.nisn)
        return { ...logbook, siswa: siswa || { nama: "Unknown", kelas: "", jurusan: "" } }
      }) as LogbookEntry[]

      setLogbooks(prev => [...prev, ...merged])
      setHasMore((moreLogbooks || []).length === pageSize)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleEdit = (logbook: LogbookEntry) => {
    setForm({
      status: logbook.status || "belum_diverifikasi",
      komentar_pembimbing: logbook.komentar_pembimbing || "",
    })
    setEditingId(logbook.id)
    setIsDialogOpen(true)
  }

  const handleView = (logbook: LogbookEntry) => {
    setViewingLogbook(logbook)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingId) return

    try {
      // Get current logbook to check old status
      const currentLogbook = logbooks.find((l) => l.id === editingId)
      const oldStatus = currentLogbook?.status

      const { error } = await supabase
        .from("logbook")
        .update({
          status: form.status,
          komentar_pembimbing: form.komentar_pembimbing || null,
        })
        .eq("id", editingId)

      if (error) throw error

      // Create notifications for student
      if (currentLogbook && oldStatus !== form.status) {
        if (form.status === "disetujui") {
          await createNotificationClient({
            nisn: currentLogbook.nisn,
            role: "siswa",
            title: "Logbook Disetujui",
            message: `Logbook Anda pada tanggal ${new Date(currentLogbook.tanggal).toLocaleDateString("id-ID")} telah disetujui.`,
            link: "/logbook",
          })
        } else if (form.status === "ditolak") {
          await createNotificationClient({
            nisn: currentLogbook.nisn,
            role: "siswa",
            title: "Logbook Ditolak",
            message: `Logbook Anda pada tanggal ${new Date(currentLogbook.tanggal).toLocaleDateString("id-ID")} ditolak.${form.komentar_pembimbing ? ` Alasan: ${form.komentar_pembimbing}` : ""}`,
            link: "/logbook",
          })
        }
      }

      toast.success("Logbook berhasil diverifikasi!")
      setIsDialogOpen(false)
      setEditingId(null)
      setForm({ status: "", komentar_pembimbing: "" })
      
      // Refresh data
      await fetchLogbooks()
      
      // Trigger real-time update for other components
      window.dispatchEvent(new CustomEvent("logbook:updated"))
    } catch (error) {
      console.error("Error updating logbook:", error)
      toast.error("Gagal memperbarui logbook!")
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "disetujui":
        return <Badge className="bg-green-100 text-green-800 px-3 py-1 text-xs font-medium">Disetujui</Badge>
      case "ditolak":
        return <Badge className="bg-red-100 text-red-800 px-3 py-1 text-xs font-medium">Ditolak</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 text-xs font-medium">Belum Diverifikasi</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleMediaClick = (url: string, e?: React.MouseEvent) => {
    // Stop event propagation untuk mencegah dialog tetap terbuka
    e?.stopPropagation()
    e?.preventDefault()
    
    // Tutup dialog terlebih dahulu
    setViewingLogbook(null)
    
    // Gunakan setTimeout untuk memastikan dialog tertutup sebelum overlay muncul
    setTimeout(() => {
      setFullMediaUrl(url)
      setIsFullScreenOpen(true)
    }, 100)
  }

  const filteredLogbooks = logbooks.filter(logbook => {
    const matchesSearch = 
      logbook.siswa?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      logbook.aktivitas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      logbook.kendala?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "Semua" || 
                         (statusFilter === "Belum Diverifikasi" && (!logbook.status || logbook.status === "belum_diverifikasi")) ||
                         (statusFilter === "Disetujui" && logbook.status === "disetujui") ||
                         (statusFilter === "Ditolak" && logbook.status === "ditolak")
    
    return matchesSearch && matchesStatus
  })

  // pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredLogbooks.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredLogbooks.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, itemsPerPage])
  useEffect(() => {
    fetchLogbooks()

    // Set up real-time subscription
    const channel = supabase
      .channel('logbook-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'logbook' }, 
        () => fetchLogbooks()
      )
      .subscribe()

    // Listen for custom events from LogbookSiswa
    const handleLogbookUpdate = () => {
      console.log("📥 LogbookGuru: Received logbook:updated event, refreshing...")
      fetchLogbooks()
    }
    
    window.addEventListener("logbook:updated", handleLogbookUpdate)
    console.log("🔊 LogbookGuru: Event listener registered for logbook:updated")

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("logbook:updated", handleLogbookUpdate)
    }
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting) {
        loadMore()
      }
    })
    const current = sentinelRef.current
    if (current) observer.observe(current)
    return () => {
      if (current) observer.unobserve(current)
    }
  }, [sentinelRef.current, logbooks, hasMore])

  // Auto focus on first input when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      const timer = setTimeout(() => {
        statusSelectRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isDialogOpen])

  // Tutup dialog ketika full screen overlay dibuka
  useEffect(() => {
    if (isFullScreenOpen && viewingLogbook) {
      setViewingLogbook(null)
    }
  }, [isFullScreenOpen])

  if (loading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Logbook Siswa</h2>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama siswa, kegiatan, atau kendala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Status: Semua</SelectItem>
                  <SelectItem value="Belum Diverifikasi">Belum Diverifikasi</SelectItem>
                  <SelectItem value="Disetujui">Disetujui</SelectItem>
                  <SelectItem value="Ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Per halaman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Per halaman: 5</SelectItem>
                  <SelectItem value="10">Per halaman: 10</SelectItem>
                  <SelectItem value="20">Per halaman: 20</SelectItem>
                </SelectContent>
              </Select>
              
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredLogbooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-sm">
              {searchTerm || statusFilter !== "Semua" 
                ? "Tidak ada logbook yang sesuai dengan filter" 
                : "Belum ada logbook siswa."
              }
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left px-4 py-3">Siswa</TableHead>
                  <TableHead className="text-left px-4 py-3">Tanggal</TableHead>
                  <TableHead className="text-left px-4 py-3">Kegiatan & Kendala</TableHead>
                  <TableHead className="text-center px-4 py-3">Status</TableHead>
                  <TableHead className="text-left px-4 py-3">Komentar</TableHead>
                  <TableHead className="text-center px-4 py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((logbook) => (
                  <TableRow key={logbook.id}>
                    <TableCell className="text-left px-4 py-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 leading-tight">{logbook.siswa?.nama || "Unknown"}</div>
                          <div className="text-sm text-gray-500 leading-tight">
                            {logbook.siswa?.kelas} - {logbook.siswa?.jurusan}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  <TableCell className="text-left px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{formatDate(logbook.tanggal)}</span>
                    </div>
                  </TableCell>
                    <TableCell className="text-left px-4 py-3 whitespace-normal">
                      <div className="max-w-md">
                        <div className="font-medium mb-1 text-gray-900">Kegiatan:</div>
                        <div className="text-sm text-gray-600 mb-2 break-words">{logbook.aktivitas}</div>
                        {logbook.kendala && (
                          <>
                            <div className="font-medium mb-1 text-gray-900">Kendala:</div>
                            <div className="text-sm text-gray-600 break-words">{logbook.kendala}</div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-4 py-3">
                      <div className="flex justify-center items-center">
                        {getStatusBadge(logbook.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-3">
                      <div className="space-y-1">
                        {logbook.komentar_pembimbing ? (
                          <div>
                            <div className="text-xs font-medium text-gray-600">Guru:</div>
                            <div className="text-xs text-gray-700">{logbook.komentar_pembimbing}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(logbook)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(logbook)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
      
        {/* Pagination */}
        {filteredLogbooks.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
            <div className="text-sm text-gray-600">
              Menampilkan {filteredLogbooks.length === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLogbooks.length)} dari {filteredLogbooks.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => (prev + 1 <= totalPages ? prev + 1 : prev))}
                disabled={currentPage >= totalPages}
                aria-label="Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      
      <div ref={sentinelRef} className="h-8" />
        

        <div ref={sentinelRef} className="h-8" />
        {loadingMore && (
          <div className="py-3 text-center text-sm text-gray-500">Memuat...</div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verifikasi Logbook</DialogTitle>
            <DialogDescription>
              Berikan status dan komentar untuk logbook siswa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="status">Status Verifikasi</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger ref={statusSelectRef}>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum_diverifikasi">Belum Diverifikasi</SelectItem>
                  <SelectItem value="disetujui">Disetujui</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="komentar">Komentar Pembimbing</Label>
              <Textarea
                id="komentar"
                placeholder="Berikan komentar dan saran untuk siswa..."
                value={form.komentar_pembimbing}
                onChange={(e) => setForm({ ...form, komentar_pembimbing: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingLogbook && !isFullScreenOpen} onOpenChange={() => setViewingLogbook(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Logbook</DialogTitle>
            <DialogDescription>
              Informasi lengkap logbook siswa
            </DialogDescription>
          </DialogHeader>
          {viewingLogbook && (
            <div className="space-y-4">
              <div>
                <Label>Siswa</Label>
                <div className="flex items-center gap-2 text-sm bg-gray-50 px-4 py-3 rounded-md">
                  <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>
                          {viewingLogbook.siswa?.nama} - {viewingLogbook.siswa?.kelas} {viewingLogbook.siswa?.jurusan}
                    </span>
                </div>
            </div>

              <div>
                <Label>Tanggal</Label>
                <div className="text-sm bg-gray-50 p-3 rounded-md">
                  {formatDate(viewingLogbook.tanggal)}
                </div>
              </div>
              {viewingLogbook.foto_url && (
                <div>
                  <Label>Media</Label>
                  <div className="mt-1">
                    {/(\.mp4|\.webm|\.ogg)$/i.test(viewingLogbook.foto_url) ? (
                      <video 
                        src={viewingLogbook.foto_url} 
                        className="w-48 h-48 rounded object-contain cursor-pointer hover:opacity-80 transition-opacity bg-gray-100" 
                        controls
                        onClick={(e) => handleMediaClick(viewingLogbook.foto_url!, e)}
                      />
                    ) : (
                      <img 
                        src={viewingLogbook.foto_url} 
                        className="w-48 h-48 rounded object-contain cursor-pointer hover:opacity-80 transition-opacity bg-gray-100" 
                        alt="Media kegiatan"
                        onClick={(e) => handleMediaClick(viewingLogbook.foto_url!, e)}
                      />
                    )}
                  </div>
                </div>
              )}
              <div>
                <Label>Kegiatan</Label>
                <div className="text-sm bg-gray-50 p-3 rounded-md">
                  {viewingLogbook.aktivitas}
                </div>
              </div>
              {viewingLogbook.kendala && (
                <div>
                  <Label>Kendala</Label>
                  <div className="text-sm bg-gray-50 p-3 rounded-md">
                    {viewingLogbook.kendala}
                  </div>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <div className="mt-1">{getStatusBadge(viewingLogbook.status)}</div>
              </div>
              {viewingLogbook.komentar_pembimbing && (
                <div>
                  <Label>Komentar Pembimbing</Label>
                  <div className="text-sm bg-blue-50 p-3 rounded-md">
                    {viewingLogbook.komentar_pembimbing}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Screen Media Overlay */}
      {isFullScreenOpen && fullMediaUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => {
            setIsFullScreenOpen(false)
            setFullMediaUrl(null)
          }}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => {
              setIsFullScreenOpen(false)
              setFullMediaUrl(null)
            }}
            aria-label="Tutup"
          >
            <XCircle className="w-8 h-8" />
          </button>
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/(\.mp4|\.webm|\.ogg)$/i.test(fullMediaUrl) ? (
              <video 
                src={fullMediaUrl} 
                controls
                className="max-w-full max-h-full rounded-lg object-contain"
                autoPlay
              />
            ) : (
              <img 
                src={fullMediaUrl} 
                alt="Media kegiatan" 
                className="max-w-full max-h-full rounded-lg object-contain"
                style={{ maxWidth: '100vw', maxHeight: '100vh' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}