"use client"

import React, { useState, useEffect, useRef } from "react"
import supabase from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Plus, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, User, Search } from "lucide-react"
import { toast } from "sonner"
import { createNotificationClient } from "@/lib/notificationClient"
import { TableSkeleton } from "@/components/skeletons/PageSkeleton"

interface LogbookEntry {
  id: number
  tanggal: string
  aktivitas: string
  kendala?: string
  nisn: number
  created_at?: string
  status?: "belum_diverifikasi" | "disetujui" | "ditolak"
  komentar_pembimbing?: string
  foto_url?: string
}
   
export function LogbookSiswa() {
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [siswa, setSiswa] = useState<{ nisn: number; nama: string; kelas?: string | null; jurusan?: string | null } | null>(null)
  const pageSize = 4
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fullMediaUrl, setFullMediaUrl] = useState<string | null>(null)
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; logbook: LogbookEntry | null }>({
    open: false,
    logbook: null,
  })

  const [form, setForm] = useState({
    tanggal: "",
    kegiatan: "",
    kendala: "",
    foto_url: ""
  })
  const logbookInputRef = useRef<HTMLInputElement>(null)


  const fetchLogbooks = async (silent: boolean = false) => {
    try {
      setLoading(true)
      console.log("Fetching logbooks for current student...")

      // Get the first available student (for demo purposes)
      const { data: siswaRows, error: siswaError } = await supabase
        .from("siswa")
        .select("nisn, nama, kelas, jurusan")
        .order("nisn", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (siswaError && siswaError.code !== 'PGRST116') {
        console.error("Error fetching student data:", JSON.stringify(siswaError, null, 2))
        if (!silent) toast.error("Gagal memuat data siswa")
        setLogbooks([])
        return
      }

      let currentSiswa = siswaRows;
      if (!currentSiswa) {
        console.log("No students found, creating sample student...")
        const { data: newSiswa, error: createError } = await supabase
          .from("siswa")
          .insert([{
            nama: "Siswa Magang",
            nisn: Math.floor(100000 + Math.random() * 900000),
            kelas: "XI RPL 1",
            jurusan: "Rekayasa Perangkat Lunak",
          }])
          .select("nisn, nama, kelas, jurusan")
          .single()
        if (createError) {
          console.error("Error creating student:", JSON.stringify(createError, null, 2))
          if (!silent) toast.error("Gagal membuat data siswa")
          setLogbooks([])
          return
        }
        currentSiswa = newSiswa;
      }
      setSiswa(currentSiswa as { nisn: number; nama: string; kelas?: string | null; jurusan?: string | null })

      // Then fetch first page of logbooks for this student by nisn
      let data: any[] | null = null
      let error: any = null
      try {
        const res = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing, foto_url")
          .eq("nisn", currentSiswa.nisn)
          .order("id", { ascending: false })
          .range(0, pageSize - 1)
        data = res.data as any[] | null
        error = res.error
      } catch (e) {
        error = e
      }
      if (error && String(error?.message || error).includes("foto_url")) {
        const res2 = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing")
          .eq("nisn", currentSiswa.nisn)
          .order("id", { ascending: false })
          .range(0, pageSize - 1)
        data = res2.data as any[] | null
        error = res2.error
      }

      if (error) {
        console.error("Error fetching logbooks:", JSON.stringify(error, null, 2))
        if (!silent) toast.error(`Gagal memuat data logbook: ${error.message}`)
        setLogbooks([])
        return
      }
      console.log("Fetched logbooks for student:", data?.length || 0)
      setLogbooks((data || []) as LogbookEntry[])
      setHasMore((data || []).length === pageSize)
    } catch (error: any) {
      console.error("Unexpected error fetching logbooks:", error.message || error)
      if (!silent) toast.error("Terjadi kesalahan yang tidak terduga saat memuat logbook")
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!siswa || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const start = logbooks.length
      const end = start + pageSize - 1
      let data: any[] | null = null
      let error: any = null
      try {
        const res = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing, foto_url")
          .eq("nisn", siswa.nisn)
          .order("id", { ascending: false })
          .range(start, end)
        data = res.data as any[] | null
        error = res.error
      } catch (e) {
        error = e
      }
      if (error && String(error?.message || error).includes("foto_url")) {
        const res2 = await supabase
          .from("logbook")
          .select("id, nisn, tanggal, aktivitas, kendala, status, komentar_pembimbing")
          .eq("nisn", siswa.nisn)
          .order("id", { ascending: false })
          .range(start, end)
        data = res2.data as any[] | null
        error = res2.error
      }
      if (error) throw error
      setLogbooks((prev) => [...prev, ...((data || []) as LogbookEntry[])])
      setHasMore((data || []).length === pageSize)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.tanggal || !form.kegiatan) {
      toast.error("Tanggal dan kegiatan harus diisi!")
      return
    }

    if (!siswa) {
      toast.error("Data siswa tidak ditemukan!")
      return
    }

    try {
      let uploadedUrl: string | null = null
      if (selectedFile) {
        try {
          setUploading(true)
          // Validasi ukuran (contoh limit 50MB sesuai batas umum upload)
          const MAX_BYTES = 50 * 1024 * 1024
          if (selectedFile.size > MAX_BYTES) {
            toast.error("Ukuran file melebihi 50MB. Kompres atau pilih file yang lebih kecil.")
            setUploading(false)
            return
          }

          const path = `${siswa.nisn}/${Date.now()}_${selectedFile.name}`

          // Tentukan contentType fallback jika browser tidak set
          let contentType = selectedFile.type
          if (!contentType) {
            const lower = selectedFile.name.toLowerCase()
            if (lower.endsWith('.mp4')) contentType = 'video/mp4'
            else if (lower.endsWith('.webm')) contentType = 'video/webm'
            else if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) contentType = 'video/ogg'
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg'
            else if (lower.endsWith('.png')) contentType = 'image/png'
            else if (lower.endsWith('.gif')) contentType = 'image/gif'
            else contentType = 'application/octet-stream'
          }
          const { error: upErr } = await supabase.storage
            .from("logbook_media")
            .upload(path, selectedFile, { cacheControl: "3600", upsert: false, contentType })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from("logbook_media").getPublicUrl(path)
          uploadedUrl = pub.publicUrl
          toast.success("Media berhasil diupload")
        } catch (err: any) {
          console.error("Upload gagal:", err)
          toast.error(`Gagal mengupload media: ${err?.message || err}`)
        } finally {
          setUploading(false)
        }
      }

      const logbookData = {
        nisn: siswa.nisn,
        tanggal: form.tanggal,
        aktivitas: form.kegiatan,
        kendala: form.kendala || null,
        status: "belum_diverifikasi" as const,
        komentar_pembimbing: null,
        foto_url: uploadedUrl || (form.foto_url || null)
      }

      if (editingId) {
        // Update existing logbook
        const { error } = await supabase
          .from("logbook")
          .update(logbookData)
          .eq("id", editingId)

        if (error) throw error
        toast.success("Logbook berhasil diperbarui!")
      } else {
        // Create new logbook
        const { error } = await supabase
          .from("logbook")
          .insert([logbookData])

      if (error) throw error
      
      // Create notification for all gurus
      if (siswa) {
        try {
          const notificationResponse = await fetch("/api/notifications/create-for-all-guru", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Logbook Baru Dikirim",
              message: `${siswa.nama} telah mengirim logbook baru pada tanggal ${new Date(form.tanggal).toLocaleDateString("id-ID")}.`,
              link: "/logbook",
            }),
          })
          const notificationData = await notificationResponse.json()
          if (notificationResponse.ok && !notificationData.skipped) {
            window.dispatchEvent(new CustomEvent("notification:created"))
          }
        } catch (error) {
          console.error("Error creating notification:", error)
          // Don't fail the logbook creation if notification fails
        }
      }
      
      toast.success("Logbook berhasil ditambahkan!")
      console.log("✅ Logbook berhasil disimpan ke database:", logbookData)
      console.log("📅 Logbook tanggal:", form.tanggal)
      }

      setForm({ tanggal: "", kegiatan: "", kendala: "", foto_url: "" })
      setSelectedFile(null)
      setEditingId(null)
      setIsDialogOpen(false)
      fetchLogbooks()
      
      // Trigger real-time update for other components
      console.log("🔄 Triggering logbook:updated event...")
      window.dispatchEvent(new CustomEvent("logbook:updated"))
      console.log("✅ LogbookSiswa: Event logbook:updated dispatched")
      
      // Force refresh dashboard after a short delay
      setTimeout(() => {
        console.log("🔄 LogbookSiswa: Force refreshing dashboard...")
        window.dispatchEvent(new CustomEvent("logbook:updated"))
      }, 1000)
    } catch (error) {
      console.error("Error saving logbook:", error)
      toast.error("Gagal menyimpan logbook!")
    }
  }

  const handleEdit = (logbook: LogbookEntry) => {
    setForm({
      tanggal: logbook.tanggal,
      kegiatan: logbook.aktivitas,
      kendala: logbook.kendala || "",
      foto_url: logbook.foto_url || ""
    })
    setSelectedFile(null)
    setEditingId(logbook.id)
    setIsDialogOpen(true)
  }

  const handleDeleteRequest = (logbook: LogbookEntry) => {
    setDeleteConfirm({ open: true, logbook })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.logbook) return
    const { id } = deleteConfirm.logbook
    try {
      const { error } = await supabase
        .from("logbook")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Logbook berhasil dihapus!")
      fetchLogbooks()
      setDeleteConfirm({ open: false, logbook: null })
      
      // Trigger real-time update for other components
      console.log("🔄 Triggering logbook:updated event (delete)...")
      window.dispatchEvent(new CustomEvent("logbook:updated"))
      console.log("✅ LogbookSiswa: Event logbook:updated dispatched (delete)")
    } catch (error) {
      console.error("Error deleting logbook:", error)
      toast.error("Gagal menghapus logbook!")
    } finally {
      setDeleteConfirm({ open: false, logbook: null })
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "disetujui":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>
      case "ditolak":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Belum Diverifikasi</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleMediaClick = (url: string) => {
    setFullMediaUrl(url)
    setIsFullScreenOpen(true)
  }

  const filteredLogbooks = logbooks.filter(logbook => {
    const matchesSearch = logbook.aktivitas.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (logbook.kendala && logbook.kendala.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "Semua" || 
                         (statusFilter === "Belum Diverifikasi" && (!logbook.status || logbook.status === "belum_diverifikasi")) ||
                         (statusFilter === "Disetujui" && logbook.status === "disetujui") ||
                         (statusFilter === "Ditolak" && logbook.status === "ditolak")
    
    return matchesSearch && matchesStatus
  })

  useEffect(() => {
    fetchLogbooks()

    // Set up real-time subscription
    const channel = supabase
      .channel('logbook-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'logbook' }, 
        () => fetchLogbooks(true)
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'siswa' }, 
        () => fetchLogbooks(true)
      )
      .subscribe()

    // Polling backup every 30 seconds
    const interval = setInterval(() => {
      fetchLogbooks(true)
    }, 30000)

    // Listen for custom events from LogbookGuru
    const handleLogbookUpdate = () => {
      console.log("📥 LogbookSiswa: Received logbook:updated event, refreshing...")
      fetchLogbooks(true)
    }
    
    window.addEventListener("logbook:updated", handleLogbookUpdate)
    console.log("🔊 LogbookSiswa: Event listener registered for logbook:updated")

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
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
        logbookInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isDialogOpen])

  // Get actual viewport height for mobile (handles address bar)
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use window.innerHeight for actual viewport height (excludes address bar)
      setViewportHeight(window.innerHeight)
    }
    
    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)
    
    // Update on scroll (for mobile browsers that hide/show address bar)
    let timeoutId: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateViewportHeight, 150)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Handle ESC key to close full screen media and prevent body scroll
  useEffect(() => {
    if (isFullScreenOpen) {
      // Update viewport height when full screen opens
      const actualHeight = window.innerHeight
      setViewportHeight(actualHeight)
      
      // Prevent body scroll when full screen is open
      const originalBodyOverflow = window.getComputedStyle(document.body).overflow
      const originalHtmlOverflow = window.getComputedStyle(document.documentElement).overflow
      const originalBodyHeight = document.body.style.height
      const originalHtmlHeight = document.documentElement.style.height
      
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.height = `${actualHeight}px`
      document.documentElement.style.height = `${actualHeight}px`
      
      // Prevent scroll on mobile - only prevent if scrolling outside the media container
      let touchStartY = 0
      const preventScroll = (e: TouchEvent) => {
        // Allow touch on the media container itself
        const target = e.target as HTMLElement
        if (target.closest('video, img')) {
          return
        }
        // Prevent scroll on the overlay background
        e.preventDefault()
      }
      
      document.addEventListener('touchmove', preventScroll, { passive: false })
      
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsFullScreenOpen(false)
          setFullMediaUrl(null)
        }
      }
      window.addEventListener("keydown", handleEsc)
      
      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
        document.body.style.height = originalBodyHeight
        document.documentElement.style.height = originalHtmlHeight
        document.removeEventListener('touchmove', preventScroll)
        window.removeEventListener("keydown", handleEsc)
      }
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
    <div className="p-2 space-y-1">
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Logbook Harian</h2>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari kegiatan atau kendala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Status: Semua</SelectItem>
                  <SelectItem value="Belum Diverifikasi">Belum Diverifikasi</SelectItem>
                  <SelectItem value="Disetujui">Disetujui</SelectItem>
                  <SelectItem value="Ditolak">Ditolak</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="5">
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Per halaman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Per halaman: 5</SelectItem>
                  <SelectItem value="10">Per halaman: 10</SelectItem>
                  <SelectItem value="20">Per halaman: 20</SelectItem>
                </SelectContent>
              </Select>
              {/* Add Button */}
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  // Reset form when dialog closes
                  setForm({ tanggal: "", kegiatan: "", kendala: "", foto_url: "" })
                  setSelectedFile(null)
                  setEditingId(null)
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setForm({ tanggal: "", kegiatan: "", kendala: "", foto_url: "" })
                      setSelectedFile(null)
                      setEditingId(null)
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                  Logbook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? "Edit Logbook" : "Tambah Logbook Baru"}
                    </DialogTitle>
                    <DialogDescription>
                      Catat kegiatan dan kendala harian Anda
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tanggal">Tanggal *</Label>
                        <Input
                          ref={logbookInputRef}
                          id="tanggal"
                          type="date"
                          value={form.tanggal}
                          onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="foto">Foto/Video Kegiatan</Label>
                        <div 
                          className="flex items-center h-10 w-full rounded-md border border-input bg-background text-sm cursor-pointer overflow-hidden shadow-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <button
                            type="button"
                            className="h-full px-4 text-sm font-medium border-r border-input bg-muted hover:bg-muted/80 text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              fileInputRef.current?.click()
                            }}
                          >
                            Choose File
                          </button>
                          <span className="px-3 text-muted-foreground flex-1 truncate text-left">
                            {selectedFile 
                              ? selectedFile.name 
                              : form.foto_url 
                                ? decodeURIComponent(form.foto_url.split('/').pop() || 'File tersedia')
                                : 'No file chosen'
                            }
                          </span>
                        </div>
                        <Input
                          ref={fileInputRef}
                          id="foto"
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="kegiatan">Kegiatan *</Label>
                      <Textarea
                        id="kegiatan"
                        placeholder="Deskripsikan kegiatan yang Anda lakukan hari ini..."
                        value={form.kegiatan}
                        onChange={(e) => setForm({ ...form, kegiatan: e.target.value })}
                        required
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="kendala">Kendala</Label>
                      <Textarea
                        id="kendala"
                        placeholder="Deskripsikan kendala yang Anda hadapi (opsional)..."
                        value={form.kendala}
                        onChange={(e) => setForm({ ...form, kendala: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit"
                        disabled={!form.tanggal || !form.kegiatan} 
                      >
                        {editingId ? "Update" : "Simpan"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredLogbooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-sm">
              {searchTerm || statusFilter !== "Semua" 
                ? "Tidak ada logbook yang sesuai dengan filter" 
                : "Belum ada logbook. Klik 'Tambah Logbook' untuk memulai."
              }
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal & Foto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kegiatan & Kendala
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catatan Verifikasi
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogbooks.map((logbook) => (
                  <tr key={logbook.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                      <div className="font-medium">{formatDate(logbook.tanggal)}</div>
                      {logbook.foto_url && (
                        <div className="mt-1">
                          {/(\.mp4|\.webm|\.ogg)$/i.test(logbook.foto_url) ? (
                            <video 
                              src={logbook.foto_url} 
                              className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                              muted 
                              loop 
                              playsInline
                              onClick={() => handleMediaClick(logbook.foto_url!)}
                            />
                          ) : (
                            <img 
                              src={logbook.foto_url} 
                              alt="Media kegiatan" 
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => handleMediaClick(logbook.foto_url!)}
                            />
                          )}
                        </div>
                      )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium mb-1">Kegiatan:</div>
                        <div className="text-sm text-gray-600 mb-2">{logbook.aktivitas}</div>
                        {logbook.kendala && (
                          <>
                            <div className="font-medium mb-1">Kendala:</div>
                            <div className="text-sm text-gray-600">{logbook.kendala}</div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(logbook.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {logbook.komentar_pembimbing || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(logbook)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequest(logbook)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={sentinelRef} className="h-8" />
            {loadingMore && (
              <div className="py-3 text-center text-sm text-gray-500">Memuat...</div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Media Overlay */}
      {isFullScreenOpen && fullMediaUrl && (
        <div 
          className="fixed z-[100] bg-black"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh', // Dynamic viewport height for mobile (excludes browser UI)
            minHeight: '100dvh',
            position: 'fixed',
            overflow: 'hidden',
            touchAction: 'none',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0
          }}
          onClick={() => {
            setIsFullScreenOpen(false)
            setFullMediaUrl(null)
          }}
        >
          <button
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 z-10 bg-black/70 rounded-full p-2 backdrop-blur-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsFullScreenOpen(false)
              setFullMediaUrl(null)
            }}
            aria-label="Tutup"
            style={{ 
              touchAction: 'manipulation', 
              WebkitTapHighlightColor: 'transparent',
              zIndex: 1000
            }}
          >
            <XCircle className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <div 
            className="flex items-center justify-center"
            style={{
              width: '100vw',
              height: '100dvh',
              maxWidth: '100vw',
              maxHeight: '100dvh',
              overflow: 'hidden',
              margin: 0,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/(\.mp4|\.webm|\.ogg)$/i.test(fullMediaUrl) ? (
              <video 
                src={fullMediaUrl} 
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100vw',
                  maxHeight: '100dvh',
                  objectFit: 'contain',
                  display: 'block',
                  margin: 0,
                  padding: 0
                }}
                autoPlay
                playsInline
                controlsList="nodownload"
              />
            ) : (
              <img 
                src={fullMediaUrl} 
                alt="Media kegiatan" 
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100vw',
                  maxHeight: '100dvh',
                  objectFit: 'contain',
                  display: 'block',
                  margin: 0,
                  padding: 0
                }}
              />
            )}
          </div>
        </div>
      )}

      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, logbook: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus logbook pada tanggal{" "}
              {deleteConfirm.logbook ? formatDate(deleteConfirm.logbook.tanggal) : "ini"}?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, logbook: null })}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}