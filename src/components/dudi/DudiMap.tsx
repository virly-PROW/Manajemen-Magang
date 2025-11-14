"use client"

import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"

// Dynamic import untuk Leaflet (nonaktifkan SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
)

// Import Leaflet CSS
if (typeof window !== "undefined") {
  require("leaflet/dist/leaflet.css")
  
  // Fix untuk default marker icon (masalah dengan Next.js)
  const L = require("leaflet")
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}

interface DudiMapData {
  id: number
  perusahaan: string
  alamat?: string
  latitude?: number
  longitude?: number
  siswa: Array<{
    nama: string
    nisn: number
  }>
  jumlah_siswa: number
}

interface DudiMapProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dudiData: DudiMapData[]
}

export function DudiMap({ open, onOpenChange, dudiData }: DudiMapProps) {
  const [mounted, setMounted] = useState(false)
  const [blueIcon, setBlueIcon] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    // Buat icon biru sekali saat komponen mount
    if (typeof window !== "undefined") {
      const L = require("leaflet")
      const icon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      setBlueIcon(icon)
    }
  }, [])

  // Default center (Indonesia)
  const defaultCenter: [number, number] = [-7.7956, 110.3695] // Yogyakarta
  const defaultZoom = 6

  // Hitung center dari semua DUDI yang punya koordinat
  const dudiWithCoords = useMemo(() => {
    return dudiData.filter((d) => d.latitude && d.longitude)
  }, [dudiData])

  const center: [number, number] = useMemo(() => {
    if (dudiWithCoords.length > 0) {
      return [
        dudiWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / dudiWithCoords.length,
        dudiWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / dudiWithCoords.length,
      ] as [number, number]
    }
    return defaultCenter
  }, [dudiWithCoords])

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Peta Lokasi DUDI</DialogTitle>
        </DialogHeader>
        <div className="w-full flex-1" style={{ height: "calc(85vh - 100px)", minHeight: "500px" }}>
          <MapContainer
            {...({
              center,
              zoom: defaultZoom,
              style: { height: "100%", width: "100%", zIndex: 0 },
              scrollWheelZoom: true,
              className: "z-0",
            } as any)}
          >
            {/* Tile layer terang biru-putih (CartoDB Positron) */}
            <TileLayer
              {...({
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
              } as any)}
            />
            {/* Render marker untuk setiap DUDI yang punya koordinat */}
            {blueIcon && dudiWithCoords.map((dudi) => (
              <Marker
                key={dudi.id}
                {...({
                  position: [dudi.latitude!, dudi.longitude!],
                  draggable: false,
                  icon: blueIcon,
                } as any)}
              >
                <Tooltip
                  {...({
                    permanent: false,
                    direction: "top",
                    offset: [0, -10],
                  } as any)}
                >
                  <div className="text-center">
                    <p className="font-semibold text-sm">{dudi.perusahaan}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Jumlah Siswa: <span className="font-bold text-blue-600">{dudi.jumlah_siswa}</span>
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  )
}