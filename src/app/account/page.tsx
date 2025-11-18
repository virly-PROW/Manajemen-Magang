"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { IconUser, IconCamera, IconLoader2 } from "@tabler/icons-react"
import supabase from "@/lib/supabaseClient"
import imageCompression from "browser-image-compression"

// Fungsi untuk mengkonversi gambar ke WebP
const convertToWebP = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0)
        
        // Convert to WebP with quality 0.85 (85% quality)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert to WebP"))
              return
            }
            
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
              lastModified: Date.now(),
            })
            resolve(webpFile)
          },
          "image/webp",
          0.85 // Quality: 0.85 (85%)
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export default function AccountPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    image: "",
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && session?.user) {
      setUserData({
        name: session.user.name || "",
        email: session.user.email || "",
        image: session.user.image || "",
      })
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      })
      setLoading(false)
    }
  }, [status, session, router])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar")
      return
    }

    // Validasi ukuran file (max 100MB sebelum kompresi)
    const MAX_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_SIZE) {
      toast.error("Ukuran file terlalu besar. Maksimal 100MB")
      return
    }

    try {
      setUploading(true)
      
      // Kompresi gambar
      const options = {
        maxSizeMB: 25, // Target ukuran setelah kompresi (25MB)
        maxWidthOrHeight: 1920, // Resolusi maksimal
        useWebWorker: true,
        fileType: file.type,
      }

      toast.info("Mengompresi gambar...")
      const compressedFile = await imageCompression(file, options)
      
      // Konversi ke WebP
      toast.info("Mengkonversi ke WebP...")
      const webpFile = await convertToWebP(compressedFile)
      
      // Tampilkan preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(webpFile)

      // Upload ke Supabase Storage
      const userId = session?.user?.id
      if (!userId) {
        toast.error("User ID tidak ditemukan")
        return
      }

      const fileName = `profile_${userId}_${Date.now()}.webp`
      const filePath = `profiles/${fileName}`

      toast.info("Mengupload gambar...")
      const { error: uploadError } = await supabase.storage
        .from("logbook_media")
        .upload(filePath, webpFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        toast.error("Gagal mengupload gambar: " + uploadError.message)
        return
      }

      // Dapatkan public URL
      const { data: urlData } = supabase.storage
        .from("logbook_media")
        .getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl

      // Update database
      const { error: updateError } = await supabase
        .from("users")
        .update({ image: imageUrl })
        .eq("id", userId)

      if (updateError) {
        console.error("Update error:", updateError)
        toast.error("Gagal menyimpan foto profil")
        return
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          image: imageUrl,
        },
      })

      setUserData((prev) => ({ ...prev, image: imageUrl }))
      setPreviewImage(null)
      toast.success("Foto profil berhasil diupdate!")
      
    } catch (error: any) {
      console.error("Error:", error)
      toast.error("Terjadi kesalahan: " + (error.message || "Unknown error"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama tidak boleh kosong")
      return
    }

    if (!formData.email.trim()) {
      toast.error("Email tidak boleh kosong")
      return
    }

    const userId = session?.user?.id
    if (!userId) {
      toast.error("User ID tidak ditemukan")
      return
    }

    try {
      setSaving(true)

      // Update database
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          email: formData.email,
        })
        .eq("id", userId)

      if (updateError) {
        console.error("Update error:", updateError)
        toast.error("Gagal menyimpan data: " + updateError.message)
        return
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          email: formData.email,
        },
      })

      setUserData((prev) => ({
        ...prev,
        name: formData.name,
        email: formData.email,
      }))

      toast.success("Data berhasil disimpan!")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error("Terjadi kesalahan: " + (error.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Settings</h1>
                <p className="text-gray-600">Kelola informasi akun dan foto profil Anda</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Foto Profil */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconUser className="h-5 w-5" />
                      Foto Profil
                    </CardTitle>
                    <CardDescription>
                      Upload foto profil Anda. Gambar akan dikompresi dan dikonversi ke format WebP otomatis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-32 w-32">
                        <AvatarImage 
                          src={previewImage || userData.image} 
                          alt={userData.name || "Profile"} 
                        />
                        <AvatarFallback className="text-2xl">
                          {userData.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex flex-col items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          disabled={uploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="gap-2"
                        >
                          {uploading ? (
                            <>
                              <IconLoader2 className="h-4 w-4 animate-spin" />
                              Mengupload...
                            </>
                          ) : (
                            <>
                              <IconCamera className="h-4 w-4" />
                              Pilih Foto
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 text-center max-w-xs">
                          Format: JPG, PNG, GIF. Maksimal 100MB (akan dikompresi dan dikonversi ke WebP ~25MB)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informasi Akun */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconUser className="h-5 w-5" />
                      Informasi Akun
                    </CardTitle>
                    <CardDescription>
                      Perbarui informasi akun Anda
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Masukkan nama Anda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Masukkan email Anda"
                      />
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saving || (formData.name === userData.name && formData.email === userData.email)}
                      className="w-full gap-2"
                    >
                      {saving ? (
                        <>
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan Perubahan"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

