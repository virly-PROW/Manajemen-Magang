"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import supabase from "@/lib/supabaseClient"

interface DudiRegistrationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dudiId: number
  dudiName: string
  nisn: string
  onSuccess: () => void
}

export function DudiRegistrationForm({
  open,
  onOpenChange,
  dudiId,
  dudiName,
  nisn,
  onSuccess,
}: DudiRegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nama: "",
    nisn: "",
    kelas: "",
    jurusan: "",
    email: "",
    no_hp: "",
    alamat: "",
    dudi_id: "",
    periode_mulai: "",
    periode_selesai: "",
  })

  const [errors, setErrors] = useState({
    nama: "",
    nisn: "",
    no_hp: "",
  })

  const namaInputRef = useRef<HTMLInputElement>(null)

  // Reset form to empty when form opens
  useEffect(() => {
    if (open) {
      // Reset form to completely empty, tapi isi NISN dan DUDI otomatis
      setForm({
        nama: "",
        nisn: nisn || "",
        kelas: "",
        jurusan: "",
        email: "",
        no_hp: "",
        alamat: "",
        dudi_id: dudiId.toString(),
        periode_mulai: "",
        periode_selesai: "",
      })
      // Reset errors
      setErrors({
        nama: "",
        nisn: "",
        no_hp: "",
      })
    }
  }, [open, dudiId, nisn])

  // Auto focus on first input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        namaInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const validateForm = () => {
    const newErrors = {
      nama: "",
      nisn: "",
      no_hp: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Check if student exists
      let siswaExists = false
      if (form.nisn) {
        const { data: siswaCheck, error: siswaCheckError } = await supabase
          .from("siswa")
          .select("nisn")
          .eq("nisn", Number(form.nisn))
          .maybeSingle()

        if (siswaCheckError && siswaCheckError.code !== "PGRST116") {
          throw siswaCheckError
        }

        siswaExists = Boolean(siswaCheck)

        if (!siswaExists) {
          // Create student first
          const studentData = {
            nisn: Number(form.nisn),
            nama: form.nama,
            kelas: form.kelas || null,
            jurusan: form.jurusan || null,
            email: form.email || null,
            no_hp: form.no_hp || null,
            alamat: form.alamat || null,
          }

          const { error: siswaError } = await supabase.from("siswa").insert([studentData])

          if (siswaError) {
            throw siswaError
          }
        } else {
          // Update student data if exists
          const { error: updateError } = await supabase
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

          if (updateError) {
            throw updateError
          }
        }
      }

      // Check if there's already an active registration
      const { data: existingRegistration, error: checkError } = await supabase
        .from("magang")
        .select("id, status_pendaftaran")
        .eq("nisn", Number(form.nisn))
        .in("status_pendaftaran", ["menunggu", "diterima"])
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingRegistration) {
        toast.error("Anda sudah memiliki pendaftaran aktif!")
        return
      }

      // Create magang record with status_pendaftaran = "menunggu" (Pending)
      const magangData = {
        nisn: Number(form.nisn),
        dudi_id: form.dudi_id ? Number(form.dudi_id) : null,
        periode_mulai: form.periode_mulai || null,
        periode_selesai: form.periode_selesai || null,
        status: null, // Status tidak diisi saat pendaftaran
        status_pendaftaran: "menunggu", // Otomatis "Pending"
      }

      const { error: magangError } = await supabase.from("magang").insert([magangData])

      if (magangError) {
        throw magangError
      }

      // Get student name for notification
      const { data: siswaData } = await supabase
        .from("siswa")
        .select("nama")
        .eq("nisn", Number(form.nisn))
        .single()

      const siswaName = siswaData?.nama || "Siswa"

      // Create notification for all gurus
      try {
        const notificationResponse = await fetch("/api/notifications/create-for-all-guru", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Pendaftaran Magang Baru",
            message: `${siswaName} telah mendaftar magang di ${dudiName}.`,
            link: "/magang",
          }),
        })
        
        const notificationData = await notificationResponse.json()
        if (notificationResponse.ok && !notificationData.skipped) {
          window.dispatchEvent(new CustomEvent("notification:created"))
        }
      } catch (error) {
        console.error("Error creating notification:", error)
        // Don't fail the registration if notification fails
      }

      toast.success("Pendaftaran berhasil dikirim! Status: Menunggu persetujuan.")
      onOpenChange(false)
      onSuccess()
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent("magang:changed"))
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Gagal mengirim pendaftaran! Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daftar Magang - {dudiName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nama">
                Nama Siswa <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={namaInputRef}
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
              {errors.nama && <p className="text-sm text-red-500 mt-1">{errors.nama}</p>}
            </div>
            <div>
              <Label htmlFor="nisn">
                NISN <span className="text-red-500">*</span>
              </Label>
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
              {errors.nisn && <p className="text-sm text-red-500 mt-1">{errors.nisn}</p>}
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
              {errors.no_hp && <p className="text-sm text-red-500 mt-1">{errors.no_hp}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea
              id="alamat"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className="h-20"
            />
          </div>
          {/* Field DUDI disembunyikan karena sudah dipilih dari tombol "Daftar Sekarang" */}
          <input type="hidden" value={form.dudi_id} />
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Pendaftaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

