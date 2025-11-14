"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import supabase from "@/lib/supabaseClient"
import { DudiFormMap } from "./DudiFormMap"

type DudiFormData = {
  perusahaan: string
  alamat: string
  email: string
  no_hp: string
  penanggung_jawab: string
  kuota: number
  latitude?: number | null
  longitude?: number | null
}

type DudiFormProps = {
  dudi?: {
    id: number
    perusahaan: string
    alamat?: string
    email?: string
    no_hp?: string
    penanggung_jawab?: string
    kuota: number
    latitude?: number | null
    longitude?: number | null
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export function DudiForm({ dudi, onSuccess, onCancel }: DudiFormProps) {
  const [form, setForm] = useState<DudiFormData>({
    perusahaan: "",
    alamat: "",
    email: "",
    no_hp: "",
    penanggung_jawab: "",
    kuota: 0,
    latitude: null,
    longitude: null,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({
    perusahaan: "",
    no_hp: "",
    email: ""
  })
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dudi changes
  useEffect(() => {
    if (dudi) {
      setForm({
        perusahaan: dudi.perusahaan,
        alamat: dudi.alamat || "",
        email: dudi.email || "",
        no_hp: dudi.no_hp || "",
        penanggung_jawab: dudi.penanggung_jawab || "",
        kuota: dudi.kuota || 0,
        latitude: dudi.latitude || null,
        longitude: dudi.longitude || null,
      })
    } else {
      setForm({
        perusahaan: "",
        alamat: "",
        email: "",
        no_hp: "",
        penanggung_jawab: "",
        kuota: 0,
        latitude: null,
        longitude: null,
      })
    }
    // Reset errors ketika form di-reset
    setErrors({ perusahaan: "", no_hp: "", email: "" })
  }, [dudi])

  // Auto focus on first input when dialog opens
  useEffect(() => {
    // Small delay to ensure dialog is fully rendered
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [dudi])

  // Validation function
  const validateForm = () => {
    const newErrors = {
      perusahaan: "",
      no_hp: "",
      email: ""
    }

    // Validasi nama perusahaan
    if (!form.perusahaan.trim()) {
      newErrors.perusahaan = "Nama perusahaan tidak boleh kosong"
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

    // Validasi email - format email standar
    if (form.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "Format email tidak valid"
      }
    }

    setErrors(newErrors)
    return !newErrors.perusahaan && !newErrors.no_hp && !newErrors.email
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasi form
    if (!validateForm()) {
      return
    }

    // ✅ Validasi kuota tidak boleh negatif
    if (form.kuota < 0) {
      toast.error("Kuota tidak boleh negatif!")
      return
    }

    // ✅ Normalisasi email → selalu lowercase
    const normalizedEmail = form.email.trim().toLowerCase()

    setLoading(true)

    try {
      const payload: any = {
        perusahaan: form.perusahaan.trim(),
        alamat: form.alamat.trim(),
        email: normalizedEmail, // <-- email sudah dipaksa lowercase
        no_hp: form.no_hp.trim(),
        penanggung_jawab: form.penanggung_jawab.trim(),
        kuota: form.kuota,
      }
      
      // Hanya tambahkan latitude dan longitude jika ada nilainya
      if (form.latitude !== null && form.latitude !== undefined) {
        payload.latitude = form.latitude
      }
      if (form.longitude !== null && form.longitude !== undefined) {
        payload.longitude = form.longitude
      }
      
      console.log("Payload yang akan disimpan:", payload)

      if (dudi) {
        // Update existing DUDI
        const { error } = await supabase
          .from("dudi")
          .update(payload)
          .eq("id", dudi.id)

        if (error) {
          console.error("Update error:", error)
          toast.error("Gagal mengupdate data DUDI!")
          return
        }
        toast.success("Data DUDI berhasil diupdate!")
      } else {
        // Insert new DUDI
        const { error } = await supabase
          .from("dudi")
          .insert([payload])

        if (error) {
          console.error("Insert error:", error)
          toast.error("Gagal menambah data DUDI!")
          return
        }
        toast.success("Data DUDI berhasil ditambahkan!")
      }

      // Reset form and close dialog
      setForm({
        perusahaan: "",
        alamat: "",
        email: "",
        no_hp: "",
        penanggung_jawab: "",
        kuota: 0,
        latitude: null,
        longitude: null,
      })
      setErrors({ perusahaan: "", no_hp: "", email: "" })
      onSuccess()
    } catch (error) {
      console.error("Unexpected error:", error)
      toast.error("Terjadi kesalahan yang tidak terduga!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {dudi ? "Edit DUDI" : "Tambah DUDI Baru"}
        </DialogTitle>
      </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="perusahaan">Nama Perusahaan *</Label>
            <Input
              ref={firstInputRef}
              id="perusahaan"
              placeholder="Masukkan nama perusahaan"
              value={form.perusahaan}
              onChange={(e) => {
                setForm({ ...form, perusahaan: e.target.value })
                if (errors.perusahaan) {
                  setErrors({ ...errors, perusahaan: "" })
                }
              }}
              required
              className="p-1"
            />
            {errors.perusahaan && (
              <p className="text-sm text-red-500 mt-1">{errors.perusahaan}</p>
            )}
          </div>

          <DudiFormMap
            address={form.alamat}
            onAddressChange={(address) => setForm({ ...form, alamat: address })}
            onLocationChange={(lat, lon) => {
              console.log("Location changed:", lat, lon)
              setForm({ ...form, latitude: lat, longitude: lon })
            }}
            initialLatitude={form.latitude}
            initialLongitude={form.longitude}
          />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email perusahaan"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value })
                if (errors.email) {
                  setErrors({ ...errors, email: "" })
                }
              }}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_hp">Telepon</Label>
            <Input
              id="no_hp"
              placeholder="Masukkan nomor telepon"
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

          <div className="space-y-2">
            <Label htmlFor="penanggung_jawab">Penanggung Jawab</Label>
            <Input
              id="penanggung_jawab"
              placeholder="Masukkan nama penanggung jawab"
              value={form.penanggung_jawab}
              onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kuota">Jumlah Siswa Magang (Kuota)</Label>
            <Input
              id="kuota"
              type="number"
              min="0"
              placeholder="Masukkan kuota siswa magang"
              value={form.kuota}
              onChange={(e) => setForm({ ...form, kuota: parseInt(e.target.value) || 0 })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : dudi ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
    </DialogContent>
  )
}
