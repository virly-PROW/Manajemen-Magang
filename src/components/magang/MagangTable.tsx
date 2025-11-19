"use client"

import React, { useEffect, useState, useRef } from "react"
import supabase from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Users, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, QrCode, Copy, Check, Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { TableSkeleton } from "@/components/skeletons/PageSkeleton"

type MagangRow = {
  id: number
  nisn: number
  dudi_id: number | null
  periode_mulai: string | null
  periode_selesai: string | null
  nilai: number | null
  status: string | null
  status_pendaftaran: string | null
  siswa?: {
    nama: string | null
    kelas: string | null
    jurusan: string | null
    email: string | null
    no_hp: string | null
    alamat: string | null
  } | null
  dudi?: {
    perusahaan: string | null
    alamat: string | null
  } | null
}

export default function MagangTable() {
  const [rows, setRows] = useState<MagangRow[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [loading, setLoading] = useState<boolean>(true)
  const [open, setOpen] = useState<boolean>(false)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const [qrOpen, setQrOpen] = useState<boolean>(false)
  const [selectedRow, setSelectedRow] = useState<MagangRow | null>(null)
  const [editing, setEditing] = useState<MagangRow | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("semua")
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; row: MagangRow | null }>({ open: false, row: null })
  const qrCodeRef = useRef<SVGSVGElement | null>(null)
  const [downloading, setDownloading] = useState<boolean>(false)
  const createInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // form state
  const [form, setForm] = useState({
    nama: "",
    nisn: "",
    kelas: "",
    jurusan: "",
    email: "",
    no_hp: "",
    alamat: "",
    jenis_kelamin: "",
    dudi_id: "",
    periode_mulai: "",
    periode_selesai: "",
    nilai: "",
    status: "berlangsung",
    status_pendaftaran: ""
  })

  // error state
  const [errors, setErrors] = useState({
    nama: "",
    nisn: "",
    no_hp: ""
  })

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch magang data with joins
      const { data: magangData, error: magangError } = await supabase
        .from("magang")
        .select(`
          id, nisn, dudi_id, periode_mulai, periode_selesai, nilai, status, status_pendaftaran
        `)
        .order("id", { ascending: false })

      if (magangError) {
        console.error("Supabase error:", magangError)
        throw magangError
      }

      // Fetch siswa data separately
      const nisnList = Array.from(new Set(magangData?.map(m => m.nisn).filter(Boolean))) as number[]
      let siswaData: Record<number, { nisn: number; nama: string | null; kelas: string | null; jurusan: string | null; email: string | null; no_hp: string | null; alamat: string | null }> = {}
      
      if (nisnList.length > 0) {
        const { data: siswaRows, error: siswaError } = await supabase
          .from("siswa")
          .select("nisn, nama, kelas, jurusan, email, no_hp, alamat")
          .in("nisn", nisnList)
          
        if (siswaError) {
          console.error("Error fetching siswa:", siswaError)
        } else {
          siswaData = (siswaRows || []).reduce((acc, s) => {
            acc[s.nisn] = s
            return acc
          }, {} as Record<number, { nisn: number; nama: string | null; kelas: string | null; jurusan: string | null; email: string | null; no_hp: string | null; alamat: string | null }>)
        }
      }

      // Fetch DUDI data separately
      const dudiIds = Array.from(new Set(magangData?.map(m => m.dudi_id).filter(Boolean))) as number[]
      let dudiData: Record<number, { id: number; perusahaan: string | null; alamat: string | null }> = {}
      
      if (dudiIds.length > 0) {
        const { data: dudiRows, error: dudiError } = await supabase
          .from("dudi")
          .select("id, perusahaan, alamat")
          .in("id", dudiIds)
          
        if (dudiError) {
          console.error("Error fetching dudi:", dudiError)
        } else {
          dudiData = (dudiRows || []).reduce((acc, d) => {
            acc[d.id] = d
            return acc
          }, {} as Record<number, { id: number; perusahaan: string | null; alamat: string | null }>)
        }
      }

      // Merge data
      const mergedData = (magangData || []).map((m) => ({
        ...m,
        siswa: siswaData[m.nisn] || null,
        dudi: dudiData[m.dudi_id] || null
      }))

      // Auto-update status menjadi "selesai" jika periode_selesai sudah lewat
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const itemsToUpdate: number[] = []
      for (const item of mergedData) {
        if (item.periode_selesai && item.status !== "selesai" && item.status !== "batal") {
          const selesaiDate = new Date(item.periode_selesai)
          selesaiDate.setHours(0, 0, 0, 0)
          
          if (selesaiDate < today) {
            itemsToUpdate.push(item.id)
          }
        }
      }
      
      if (itemsToUpdate.length > 0) {
        // Update semua item yang perlu diupdate
        const { error: updateError } = await supabase
          .from("magang")
          .update({ status: "selesai" })
          .in("id", itemsToUpdate)
        
        if (!updateError) {
          // Refresh data setelah update
          const { data: updatedMagangData } = await supabase
            .from("magang")
            .select(`
              id, nisn, dudi_id, periode_mulai, periode_selesai, nilai, status, status_pendaftaran
            `)
            .order("id", { ascending: false })
          
          if (updatedMagangData) {
            const updatedMergedData = updatedMagangData.map((m) => ({
              ...m,
              siswa: siswaData[m.nisn] || null,
              dudi: dudiData[m.dudi_id] || null
            }))
            setRows(updatedMergedData)
          } else {
            setRows(mergedData)
          }
        } else {
          setRows(mergedData)
        }
      } else {
        setRows(mergedData)
      }

      console.log("Data fetched successfully:", mergedData.length, "rows")
      console.log("Merged data:", mergedData)

    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Gagal memuat data magang")
    } finally {
      setLoading(false)
    }
  }

  // Validation function
  const validateForm = () => {
    const newErrors = {
      nama: "",
      nisn: "",
      no_hp: ""
    }

    // Validasi nama
    if (!form.nama.trim()) {
      newErrors.nama = "Nama tidak boleh kosong"
    }

    // Validasi NISN - harus 10 angka
    if (!form.nisn.trim()) {
      newErrors.nisn = "NISN harus diisi"
    } else if (!/^\d{10}$/.test(form.nisn)) {
      newErrors.nisn = "NISN harus 10 angka"
    }

    // Validasi telepon - min 10 angka, awalan 08/62, harus angka
    if (form.no_hp.trim()) {
      if (!/^\d+$/.test(form.no_hp)) {
        newErrors.no_hp = "Telepon harus berupa angka"
      } else if (form.no_hp.length < 10) {
        newErrors.no_hp = "Telepon minimal 10 angka"
      } else if (!form.no_hp.startsWith("08") && !form.no_hp.startsWith("62")) {
        newErrors.no_hp = "Telepon harus diawali dengan 08 atau 62"
      }
    }

    setErrors(newErrors)
    return !newErrors.nama && !newErrors.nisn && !newErrors.no_hp
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasi form
    if (!validateForm()) {
      return
    }

    try {
      console.log("Starting form submission with data:", form)
      
      // Check if student exists
      let siswaExists = false
      if (form.nisn) {
        const { data: siswaCheck, error: siswaCheckError } = await supabase
          .from("siswa")
          .select("nisn")
          .eq("nisn", Number(form.nisn))
          .maybeSingle()
          
        if (siswaCheckError) {
          console.error("Error checking student:", siswaCheckError)
          throw siswaCheckError
        }
        
        siswaExists = Boolean(siswaCheck)
        console.log("Student exists:", siswaExists)

        if (!siswaExists) {
          // Create student first
          const studentData = {
            nisn: Number(form.nisn),
            nama: form.nama,
            kelas: form.kelas || null,
            jurusan: form.jurusan || null,
            email: form.email || null,
            no_hp: form.no_hp || null,
            alamat: form.alamat || null
          }
          
          console.log("Creating student with data:", studentData)
          
          const { error: siswaError } = await supabase
            .from("siswa")
            .insert([studentData])

          if (siswaError) {
            console.error("Error creating student:", siswaError)
            throw siswaError
          }
          
          console.log("Student created successfully")
        }
      }

      // Create magang record
      const magangData = {
        nisn: Number(form.nisn),
        dudi_id: form.dudi_id ? Number(form.dudi_id) : null,
        periode_mulai: form.periode_mulai || null,
        periode_selesai: form.periode_selesai || null,
        nilai: form.nilai ? Number(form.nilai) : null,
        status: form.status || "berlangsung",
        status_pendaftaran: "diterima"
      }
      
      console.log("Creating magang with data:", magangData)
      
      const { error: magangError } = await supabase
        .from("magang")
        .insert([magangData])

      if (magangError) {
        console.error("Error creating magang:", magangError)
        throw magangError
      }

      console.log("Magang created successfully")
      toast.success("Data magang berhasil ditambahkan!")
      
      // Reset form
      setForm({
        nama: "", nisn: "", kelas: "", jurusan: "", email: "", no_hp: "", alamat: "",
        jenis_kelamin: "", dudi_id: "", periode_mulai: "", periode_selesai: "", nilai: "", status: "berlangsung",
        status_pendaftaran: ""
      })
      setErrors({ nama: "", nisn: "", no_hp: "" })
      setOpen(false)
      
      // Refresh data to update table
      console.log("Refreshing data after successful submission...")
      await fetchData()
      
      // Trigger event for SectionCardsMagang to update
      window.dispatchEvent(new CustomEvent("magang:changed"))
    } catch (error) {
      console.error("Error submitting form:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      toast.error("Gagal menambahkan data magang!")
    }
  }

  // Get DUDI options
  const [dudiOptions, setDudiOptions] = useState<{id: number, perusahaan: string}[]>([])
  
  const fetchDudiOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("dudi")
        .select("id, perusahaan")
        .order("perusahaan")

      if (error) throw error
      setDudiOptions(data || [])
    } catch (error) {
      console.error("Error fetching DUDI options:", error)
    }
  }

  // Handle edit
  const handleEdit = (row: MagangRow) => {
    setEditing(row)
    const statusPendaftaran = row.status_pendaftaran || ""
    // Jika status_pendaftaran adalah "menunggu", set status default menjadi "menunggu"
    const defaultStatus = statusPendaftaran === "menunggu" ? "menunggu" : (row.status || "berlangsung")
    
    setForm({
      nama: row.siswa?.nama || "",
      nisn: row.nisn.toString(),
      kelas: row.siswa?.kelas || "",
      jurusan: row.siswa?.jurusan || "",
      email: row.siswa?.email || "",
      no_hp: row.siswa?.no_hp || "",
      alamat: row.siswa?.alamat || "",
      jenis_kelamin: "",
      dudi_id: row.dudi_id?.toString() || "",
      periode_mulai: row.periode_mulai || "",
      periode_selesai: row.periode_selesai || "",
      nilai: row.nilai?.toString() || "",
      status: defaultStatus,
      status_pendaftaran: statusPendaftaran
    })
    setEditOpen(true)
  }

  // Handle delete
  const handleDelete = (row: MagangRow) => {
    setDeleteConfirm({ open: true, row })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.row) return

    try {
      console.log("Deleting magang record:", deleteConfirm.row.id)
      
      const { error } = await supabase
        .from("magang")
        .delete()
        .eq("id", deleteConfirm.row.id)

      if (error) {
        console.error("Error deleting magang:", error)
        throw error
      }

      console.log("Delete successful")
      toast.success("Data magang berhasil dihapus!")
      
      // Refresh data
      await fetchData()
      window.dispatchEvent(new CustomEvent("magang:changed"))
      
      setDeleteConfirm({ open: false, row: null })
    } catch (error) {
      console.error("Error deleting data:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      toast.error("Gagal menghapus data magang!")
    }
  }

  // Handle QR code display
  const handleShowQR = (row: MagangRow) => {
    setSelectedRow(row)
    setQrOpen(true)
    setCopied(false)
  }

  // Handle copy link
  const handleCopyLink = async () => {
    if (!selectedRow) return
    
    const link = `${window.location.origin}/siswa/${selectedRow.id}`
    
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Link berhasil disalin!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error copying link:", error)
      toast.error("Gagal menyalin link")
    }
  }

  const handleDownloadQR = async () => {
    if (!selectedRow || !qrCodeRef.current) {
      toast.error("QR code tidak tersedia untuk diunduh")
      return
    }

    try {
      setDownloading(true)

      const svgElement = qrCodeRef.current
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgElement)
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      const image = new Image()
      const sizeAttr = Number(svgElement.getAttribute("width")) || 256
      const size = Number.isFinite(sizeAttr) && sizeAttr > 0 ? sizeAttr : 256

      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          toast.error("Gagal memproses QR code")
          URL.revokeObjectURL(svgUrl)
          setDownloading(false)
          return
        }

        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(image, 0, 0, size, size)
        URL.revokeObjectURL(svgUrl)

        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error("Gagal membuat file QR code")
            setDownloading(false)
            return
          }

          const downloadUrl = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = downloadUrl
          link.download = `qr-magang-${selectedRow.id}.webp`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
          setDownloading(false)
        }, "image/webp")
      }

      image.onerror = () => {
        toast.error("Gagal memuat QR code untuk diunduh")
        URL.revokeObjectURL(svgUrl)
        setDownloading(false)
      }

      image.src = svgUrl
    } catch (error) {
      console.error("Error downloading QR code:", error)
      toast.error("Terjadi kesalahan saat mengunduh QR code")
      setDownloading(false)
    }
  }

  // Handle update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editing || !form.nama || !form.nisn) {
      toast.error("Nama dan NISN harus diisi!")
      return
    }
    /// update nisn harus angka 
   

    try {
      console.log("Starting update with data:", form)
      
      // Update student data
      const { error: siswaError } = await supabase
        .from("siswa")
        .update({
          nama: form.nama,
          kelas: form.kelas || null,
          jurusan: form.jurusan || null,
          email: form.email || null,
          no_hp: form.no_hp || null,
          alamat: form.alamat || null,
        })
        .eq("nisn", Number(form.nisn))

      if (siswaError) {
        console.error("Error updating student:", siswaError)
        throw siswaError
      }

      // Update magang data
      // Jika status diubah ke "berlangsung", berarti pendaftaran diterima
      let newStatusPendaftaran = editing.status_pendaftaran || "diterima"
      let newStatus = form.status || "berlangsung"
      
      if (form.status === "berlangsung") {
        // Jika dipilih "berlangsung", berarti diterima
        newStatusPendaftaran = "diterima"
        newStatus = "berlangsung"
      } else if (form.status === "batal") {
        // Jika dibatalkan, kembalikan ke menunggu
        newStatusPendaftaran = "menunggu"
        newStatus = "batal"
      } else if (form.status === "menunggu") {
        // Jika dipilih "menunggu", tetap menunggu
        newStatusPendaftaran = "menunggu"
        newStatus = "menunggu"
      } else {
        // Status lain (selesai), status_pendaftaran tetap sesuai yang ada
        newStatus = form.status
      }
      
      const { error: magangError } = await supabase
        .from("magang")
        .update({
          dudi_id: form.dudi_id ? Number(form.dudi_id) : null,
          periode_mulai: form.periode_mulai || null,
          periode_selesai: form.periode_selesai || null,
          nilai: form.nilai ? Number(form.nilai) : null,
          status: newStatus,
          status_pendaftaran: newStatusPendaftaran,
        })
        .eq("id", editing.id)

      if (magangError) {
        console.error("Error updating magang:", magangError)
        throw magangError
      }

      console.log("Update successful")
      
      // Create notifications based on status changes
      const oldStatusPendaftaran = editing.status_pendaftaran
      const oldStatus = editing.status
      
      // Notifikasi untuk semua siswa: diterima/ditolak magang
      if (newStatusPendaftaran === "diterima" && oldStatusPendaftaran === "menunggu") {
        try {
          const notificationResponse = await fetch("/api/notifications/create-for-all-siswa", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Pendaftaran Magang Diterima",
              message: `Pendaftaran magang telah diterima. Status: ${editing.dudi?.perusahaan || "Magang"}`,
              link: "/magang",
            }),
          })
          const notificationData = await notificationResponse.json()
          if (notificationResponse.ok && !notificationData.skipped) {
            window.dispatchEvent(new CustomEvent("notification:created"))
          }
        } catch (error) {
          console.error("Error creating notification:", error)
          // Don't fail the update if notification fails
        }
      } else if (newStatusPendaftaran === "ditolak" && oldStatusPendaftaran !== "ditolak") {
        try {
          const notificationResponse = await fetch("/api/notifications/create-for-all-siswa", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Pendaftaran Magang Ditolak",
              message: `Maaf, pendaftaran magang ditolak. Silakan daftar ke DUDI lain.`,
              link: "/dudi",
            }),
          })
          const notificationData = await notificationResponse.json()
          if (notificationResponse.ok && !notificationData.skipped) {
            window.dispatchEvent(new CustomEvent("notification:created"))
          }
        } catch (error) {
          console.error("Error creating notification:", error)
          // Don't fail the update if notification fails
        }
      }
      
      // Notifikasi untuk guru: siswa selesai magang
      if (newStatus === "selesai" && oldStatus !== "selesai") {
        const siswaName = editing.siswa?.nama || "Siswa"
        try {
          const notificationResponse = await fetch("/api/notifications/create-for-all-guru", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "Siswa Selesai Magang",
              message: `${siswaName} telah menyelesaikan magang.`,
              link: "/magang",
            }),
          })
          const notificationData = await notificationResponse.json()
          if (notificationResponse.ok && !notificationData.skipped) {
            window.dispatchEvent(new CustomEvent("notification:created"))
          }
        } catch (error) {
          console.error("Error creating notification:", error)
          // Don't fail the update if notification fails
        }
      }
      
      // Jika status diubah ke "berlangsung", berarti pendaftaran diterima
      if (form.status === "berlangsung" && editing.status_pendaftaran === "menunggu") {
        toast.success("Data magang berhasil diperbarui!'")
      } else {
        toast.success("Data magang berhasil diperbarui!")
      }
      
      // Reset form and close dialog
      setForm({
        nama: "", nisn: "", kelas: "", jurusan: "", email: "", no_hp: "", alamat: "",
        jenis_kelamin: "", dudi_id: "", periode_mulai: "", periode_selesai: "", nilai: "", status: "berlangsung",
        status_pendaftaran: ""
      })
      setEditOpen(false)
      setEditing(null)
      
      // Refresh data
      await fetchData()
      window.dispatchEvent(new CustomEvent("magang:changed"))
      // Trigger refresh untuk DUDI table juga agar kuota ter-update
      window.dispatchEvent(new CustomEvent("dudi:changed"))
    } catch (error) {
      console.error("Error updating data:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      toast.error("Gagal memperbarui data magang!")
    }
  }


  useEffect(() => {
    fetchData()
    fetchDudiOptions()

    // Add realtime listener for automatic updates
    const channel = supabase
      .channel('magang-table-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'magang' 
        }, 
        (payload) => {
          console.log('Magang table changed:', payload)
          fetchData()
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'siswa' 
        }, 
        (payload) => {
          console.log('Siswa table changed:', payload)
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredRows = React.useMemo(() => {
    let filtered = rows

    // Filter by status
    if (statusFilter !== "semua") {
      filtered = filtered.filter((row) => row.status === statusFilter)
    }

    // Filter by search term
    const query = searchTerm.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter((row) => {
        const searchFields = [
          row.siswa?.nama ?? "",
          row.nisn?.toString() ?? "",
          row.siswa?.kelas ?? "",
          row.siswa?.jurusan ?? "",
          row.dudi?.perusahaan ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return searchFields.includes(query)
      })
    }

    return filtered
  }, [rows, searchTerm, statusFilter])

  // Auto focus on first input when create dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        createInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Auto focus on first input when edit dialog opens
  useEffect(() => {
    if (editOpen) {
      const timer = setTimeout(() => {
        editInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [editOpen])

  if (loading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Table Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Siswa Magang</h2>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari siswa, NIS, kelas, jurusan, DUDI..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPageIndex(0) // Reset to first page when search changes
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setPageIndex(0) // Reset to first page when filter changes
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua</SelectItem>
                  <SelectItem value="berlangsung">Berlangsung</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="batal">Batal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value))
                setPageIndex(0) // Reset to first page when page size changes
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Per halaman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              {/* Add Student Button moved here */}
              <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen)
                if (isOpen) {
                  // Reset errors ketika dialog dibuka
                  setErrors({ nama: "", nisn: "", no_hp: "" })
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                  Siswa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Tambah Siswa Magang</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nama">Nama Siswa *</Label>
                        <Input
                          ref={createInputRef}
                          id="nama"
                          value={form.nama}
                          onChange={(e) => {
                            setForm({ ...form, nama: e.target.value })
                            if (errors.nama) {
                              setErrors({ ...errors, nama: "" })
                            }
                          }}
                          required
                        />
                        {errors.nama && (
                          <p className="text-sm text-red-500 mt-1">{errors.nama}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="nisn">NISN *</Label>
                        <Input
                          id="nisn"
                          value={form.nisn}
                          onChange={(e) => {
                            setForm({ ...form, nisn: e.target.value })
                            if (errors.nisn) {
                              setErrors({ ...errors, nisn: "" })
                            }
                          }}
                          required
                        />
                        {errors.nisn && (
                          <p className="text-sm text-red-500 mt-1">{errors.nisn}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="kelas">Kelas</Label>
                        <Input
                          id="kelas"
                          value={form.kelas}
                          onChange={(e) => setForm({ ...form, kelas: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="jurusan">Jurusan</Label>
                        <Input
                          id="jurusan"
                          value={form.jurusan}
                          onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="no_hp">Telepon</Label>
                        <Input
                          id="no_hp"
                          value={form.no_hp}
                          onChange={(e) => {
                            setForm({ ...form, no_hp: e.target.value })
                            if (errors.no_hp) {
                              setErrors({ ...errors, no_hp: "" })
                            }
                          }}
                        />
                        {errors.no_hp && (
                          <p className="text-sm text-red-500 mt-1">{errors.no_hp}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="alamat">Alamat</Label>
                      <Textarea
                        id="alamat"
                        value={form.alamat}
                        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                        className="h-12 min-h-0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dudi">DUDI</Label>
                        <Select value={form.dudi_id} onValueChange={(value) => setForm({ ...form, dudi_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih DUDI" />
                          </SelectTrigger>
                          <SelectContent>
                            {dudiOptions.map((dudi) => (
                              <SelectItem key={dudi.id} value={dudi.id.toString()}>
                                {dudi.perusahaan}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="berlangsung">Berlangsung</SelectItem>
                            <SelectItem value="selesai">Selesai</SelectItem>
                            <SelectItem value="batal">Batal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="periode_mulai">Periode Mulai</Label>
                        <Input
                          id="periode_mulai"
                          type="date"
                          value={form.periode_mulai}
                          onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="periode_selesai">Periode Selesai</Label>
                        <Input
                          id="periode_selesai"
                          type="date"
                          value={form.periode_selesai}
                          onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nilai">Nilai</Label>
                        <Input
                          id="nilai"
                          type="number"
                          min="0"
                          max="100"
                          value={form.nilai}
                          onChange={(e) => setForm({ ...form, nilai: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit">Simpan</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Belum ada data siswa magang</p>
            <p className="text-sm">Klik &quot;Tambah Siswa&quot; untuk menambahkan data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-grey-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Siswa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas & Jurusan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DUDI
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nilai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows
                  .slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
                  .map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {row.siswa?.nama || 'Nama tidak tersedia'}
                        </div>
                        <div className="text-sm text-gray-500">
                          NISN: {row.nisn}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {row.siswa?.kelas || 'Kelas tidak tersedia'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {row.siswa?.jurusan || 'Jurusan tidak tersedia'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {row.dudi?.perusahaan || 'DUDI tidak tersedia'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {row.periode_mulai || 'Belum ditentukan'}
                        </div>
                        <div className="text-sm text-gray-500">
                          s/d {row.periode_selesai || 'Belum ditentukan'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'selesai' 
                          ? 'bg-green-100 text-green-800'
                          : row.status === 'berlangsung'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {row.status === 'selesai' ? 'Selesai' : 
                         row.status === 'berlangsung' ? 'Berlangsung' : 
                         'Menunggu'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {row.nilai ? `${row.nilai}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleShowQR(row)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(row)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(row)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
              <div className="text-sm text-gray-600">
                Menampilkan {filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1}
                -{Math.min(filteredRows.length, (pageIndex + 1) * pageSize)} dari {filteredRows.length}
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
                  onClick={() => setPageIndex((p) => ((p + 1) * pageSize < filteredRows.length ? p + 1 : p))}
                  disabled={(pageIndex + 1) * pageSize >= filteredRows.length}
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Siswa Magang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-nama">Nama Siswa *</Label>
                <Input
                  ref={editInputRef}
                  id="edit-nama"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-nisn">NISN *</Label>
                <Input
                  id="edit-nisn"
                  value={form.nisn}
                  onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-kelas">Kelas</Label>
                <Input
                  id="edit-kelas"
                  value={form.kelas}
                  onChange={(e) => setForm({ ...form, kelas: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-jurusan">Jurusan</Label>
                <Input
                  id="edit-jurusan"
                  value={form.jurusan}
                  onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-no_hp">Telepon</Label>
                <Input
                  id="edit-no_hp"
                  value={form.no_hp}
                  onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-alamat">Alamat</Label>
              <Textarea
                id="edit-alamat"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-dudi">DUDI</Label>
                <Select value={form.dudi_id} onValueChange={(value) => setForm({ ...form, dudi_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih DUDI" />
                  </SelectTrigger>
                  <SelectContent>
                    {dudiOptions.map((dudi) => (
                      <SelectItem key={dudi.id} value={dudi.id.toString()}>
                        {dudi.perusahaan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(value) => {
                    setForm({ ...form, status: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="berlangsung">Berlangsung</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                    <SelectItem value="menunggu">Menunggu</SelectItem>
                    <SelectItem value="batal">Batal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-periode-mulai">Periode Mulai</Label>
                <Input
                  id="edit-periode-mulai"
                  type="date"
                  value={form.periode_mulai}
                  onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-periode-selesai">Periode Selesai</Label>
                <Input
                  id="edit-periode-selesai"
                  type="date"
                  value={form.periode_selesai}
                  onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-nilai">Nilai</Label>
                <Input
                  id="edit-nilai"
                  type="number"
                  min="0"
                  max="100"
                  value={form.nilai}
                  onChange={(e) => setForm({ ...form, nilai: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Data Magang Siswa</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="flex flex-col items-center space-y-4 py-4">
              {/* Generate Link */}
              {(() => {
                const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/siswa/${selectedRow.id}`
                
                return (
                  <>
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <QRCodeSVG
                        value={link}
                        size={256}
                        level="H"
                        includeMargin={true}
                        ref={qrCodeRef}
                      />
                    </div>
                    
                    {/* Link Display with Copy Button */}
                    <div className="w-full space-y-2">
                      <label className="text-sm font-medium text-gray-700">Link:</label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={link}
                          readOnly
                          className="flex-1 text-sm bg-gray-50"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopyLink}
                          className="shrink-0"
                          title="Salin link"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDownloadQR}
                            disabled={downloading}
                            className="flex items-center gap-2 bg-white text-black hover:bg-gray-100"
                            title="Download QR"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQrOpen(false)}>
            Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, row: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data magang untuk {deleteConfirm.row?.siswa?.nama || 'siswa ini'}? 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, row: null })}
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

    </div>
  )
}




