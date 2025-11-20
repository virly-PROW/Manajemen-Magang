"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderAccount } from "@/components/site-header-account"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { IconUser, IconCamera, IconLoader2, IconLock, IconX } from "@tabler/icons-react"
import supabase from "@/lib/supabaseClient"
import imageCompression from "browser-image-compression"
import { AccountPageSkeleton } from "@/components/skeletons/PageSkeleton"

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
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(Date.now())
  const [compressImage, setCompressImage] = useState(true)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // State untuk full screen preview foto profil
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

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

    // Simpan file dan buat preview
    setSelectedFile(file)
    
    // Buat preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setIsImageModalOpen(true)
    }
    reader.onerror = () => {
      toast.error("Gagal membaca file")
    }
    reader.readAsDataURL(file)
  }

  const handleUploadImage = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setIsImageModalOpen(false)
      
      let processedFile: File = selectedFile

      // Kompresi gambar jika checkbox dicentang
      if (compressImage) {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: selectedFile.type,
        }

        toast.info("Mengompresi gambar...")
        processedFile = await imageCompression(selectedFile, options)
      }
      
      // Konversi ke WebP
      toast.info("Mengkonversi ke WebP...")
      const webpFile = await convertToWebP(processedFile)
      
      // Tampilkan preview dari file yang sudah dikonversi
      const previewPromise = new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          setPreviewImage(result)
          resolve(result)
        }
        reader.onerror = () => {
          resolve('')
        }
        reader.readAsDataURL(webpFile)
      })
      
      await previewPromise

      const userEmail = session?.user?.email
      if (!userEmail) {
        toast.error("Email tidak ditemukan")
        return
      }

      const { data: userDataFromDb, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (userError || !userDataFromDb) {
        console.error("Error fetching user:", userError)
        toast.error("Gagal menemukan data user")
        return
      }

      const userId = userDataFromDb.id
      const timestamp = Date.now()
      const fileName = `profile_${userId}_${timestamp}.webp`
      const filePath = `profiles/${fileName}`

      toast.info("Mengupload gambar...")
      
      // Hapus file lama jika ada
      if (userData.image && userData.image.includes('logbook_media')) {
        try {
          const urlParts = userData.image.split('/')
          const storageIndex = urlParts.findIndex(part => part === 'logbook_media')
          if (storageIndex !== -1 && storageIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(storageIndex + 1).join('/')
            console.log("Menghapus file lama:", oldPath)
            
            const { error: deleteError } = await supabase.storage
              .from("logbook_media")
              .remove([oldPath])
            
            if (deleteError) {
              console.error("Error menghapus file lama:", deleteError)
            } else {
              console.log("File lama berhasil dihapus")
            }
          }
        } catch (err) {
          console.log("File lama tidak ditemukan atau sudah dihapus:", err)
        }
      }
      
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

      const { data: urlData } = supabase.storage
        .from("logbook_media")
        .getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl

      console.log("Image URL baru:", imageUrl)

      const { error: updateError, data: updateData } = await supabase
        .from("users")
        .update({ image: imageUrl })
        .eq("id", userId)
        .select()

      if (updateError) {
        console.error("Update error:", updateError)
        console.error("Error details:", JSON.stringify(updateError, null, 2))
        
        if (updateError.message?.includes("column") && updateError.message?.includes("image")) {
          toast.error("Kolom 'image' belum ada di database. Silakan jalankan script SQL untuk menambahkan kolom tersebut.")
        } else {
          toast.error("Gagal menyimpan foto profil: " + (updateError.message || "Unknown error"))
        }
        return
      }

      if (!updateData || updateData.length === 0) {
        console.error("No data returned from update")
        toast.error("Gagal menyimpan foto profil: Tidak ada data yang diupdate")
        return
      }

      console.log("Database updated successfully:", updateData)

      await update({
        ...session,
        user: {
          ...session?.user,
          image: imageUrl,
        },
      })

      setUserData((prev) => ({ ...prev, image: imageUrl }))
      
      const imageUrlWithCache = `${imageUrl}?t=${timestamp}`
      setPreviewImage(imageUrlWithCache)
      
      setImageKey(timestamp)
      
      toast.success("Foto profil berhasil diupdate!")
      
      setTimeout(() => {
        router.refresh()
      }, 2000)
      
    } catch (error: any) {
      console.error("Error:", error)
      toast.error("Terjadi kesalahan: " + (error.message || "Unknown error"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }

  const handleCancelImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAvatarClick = () => {
    const url = previewImage || userData.image || null
    if (!url) {
      toast.info("Belum ada foto profil untuk ditampilkan")
      return
    }
    setAvatarPreviewUrl(url)
    setIsAvatarPreviewOpen(true)
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

    const userEmail = session?.user?.email
    if (!userEmail) {
      toast.error("Email tidak ditemukan")
      return
    }

    try {
      setSaving(true)

      const { data: userDataFromDb, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (userError || !userDataFromDb) {
        console.error("Error fetching user:", userError)
        toast.error("Gagal menemukan data user")
        return
      }

      const userId = userDataFromDb.id

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

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Semua field password harus diisi")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru dan konfirmasi password tidak cocok")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter")
      return
    }

    const userEmail = session?.user?.email
    if (!userEmail) {
      toast.error("Email tidak ditemukan")
      return
    }

    try {
      setChangingPassword(true)

      const { data: userDataFromDb, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (userError || !userDataFromDb) {
        console.error("Error fetching user:", userError)
        toast.error("Gagal menemukan data user")
        return
      }

      const userId = userDataFromDb.id

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Gagal mengubah password")
        return
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast.success("Password berhasil diubah!")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error("Terjadi kesalahan: " + (error.message || "Unknown error"))
    } finally {
      setChangingPassword(false)
    }
  }

  if (status === "unauthenticated") {
    return null
  }

  if (status === "loading" || loading) {
    return (
      <>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeaderAccount />
          <AccountPageSkeleton />
        </SidebarInset>
      </>
    )
  }

  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeaderAccount />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 w-full max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Settings</h1>
                <p className="text-gray-600">Kelola informasi akun dan foto profil Anda</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Kolom Kiri: Foto Profil + Informasi Akun */}
                <div className="flex flex-col gap-6">
                  {/* Foto Profil */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconUser className="h-5 w-5" />
                        Foto Profil
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col items-center gap-4">
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-full transition-transform hover:scale-105"
                        >
                          <Avatar className="h-32 w-32 sm:h-40 sm:w-40" key={imageKey}>
                            <AvatarImage 
                              src={
                                previewImage 
                                  ? previewImage 
                                  : userData.image 
                                    ? `${userData.image}${userData.image.includes('?') ? '&' : '?'}t=${imageKey}` 
                                    : ''
                              } 
                              alt={userData.name || "Profile"}
                              onError={(e) => {
                                console.error("Error loading image:", e.currentTarget.src)
                                if (userData.image && e.currentTarget.src.includes('?t=')) {
                                  e.currentTarget.src = userData.image
                                }
                              }}
                              onLoad={() => {
                                console.log("Image loaded successfully")
                              }}
                            />
                            <AvatarFallback className="text-3xl">
                              {userData.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        
                        <div className="flex flex-col items-center gap-3 w-full">
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

                {/* Kolom Kanan: Password */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconLock className="h-5 w-5" />
                      Ubah Password
                    </CardTitle>
                    <CardDescription>
                      Ubah password akun Anda untuk keamanan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Password Saat Ini</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        placeholder="Masukkan password saat ini"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Password Baru</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        placeholder="Masukkan password baru (min. 6 karakter)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        placeholder="Ulangi password baru"
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {changingPassword ? (
                        <>
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                          Mengubah...
                        </>
                      ) : (
                        <>
                          <IconLock className="h-4 w-4" />
                          Ubah Password
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Full Screen Avatar Preview - DIGANTI DARI MODAL */}
      {isAvatarPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setIsAvatarPreviewOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsAvatarPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            aria-label="Close preview"
          >
            <IconX className="h-6 w-6 text-white" />
          </button>

          {/* Image Container - Scrollable */}
          <div 
            className="relative w-full h-full overflow-auto flex items-start justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {avatarPreviewUrl ? (
              <img
                src={avatarPreviewUrl}
                alt="Foto Profil"
                className="rounded-lg cursor-pointer"
                onClick={() => setIsAvatarPreviewOpen(false)}
                style={{ maxWidth: 'none', height: 'auto' }}
              />
            ) : (
              <p className="text-white text-sm">Tidak ada foto untuk ditampilkan.</p>
            )}
          </div>

          {/* User Info */}
          {avatarPreviewUrl && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <p className="text-white text-lg font-medium drop-shadow-lg">{userData.name}</p>
              <p className="text-white/70 text-sm drop-shadow-lg">{userData.email}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Preview Image (before upload) - TETAP MODAL */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Foto Profil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview Image */}
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 w-auto rounded-lg object-contain"
                />
              </div>
            )}

            {/* Checkbox untuk compress image */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="compress-image-modal"
                checked={compressImage}
                onCheckedChange={(checked) => setCompressImage(checked === true)}
                disabled={uploading}
              />
              <Label
                htmlFor="compress-image-modal"
                className="text-sm font-normal cursor-pointer"
              >
                Kompresi gambar
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelImageModal}
              disabled={uploading}
            >
              Batal
            </Button>
            <Button
              onClick={handleUploadImage}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Mengupload...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}