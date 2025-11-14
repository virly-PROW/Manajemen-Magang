"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"
import {ChevronLeft, ChevronRight } from "lucide-react"

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

// Import hooks - akan di-import secara dinamis di dalam komponen

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

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface DudiFormMapProps {
  address: string
  onAddressChange: (address: string) => void
  onLocationChange?: (lat: number, lon: number) => void
  initialLatitude?: number | null
  initialLongitude?: number | null
}

// Komponen untuk update map center (flyTo)
function MapUpdater({ center }: { center: [number, number] }) {
  const { useMap } = require("react-leaflet")
  const map = useMap()
  
  useEffect(() => {
    map.flyTo(center, 15, {
      duration: 1.5,
    })
  }, [map, center])
  
  return null
}

// Komponen untuk handle map click
function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  const { useMap } = require("react-leaflet")
  const map = useMap()
  
  useEffect(() => {
    const handleClick = (e: any) => {
      onMapClick(e)
    }
    
    map.on('click', handleClick)
    
    return () => {
      map.off('click', handleClick)
    }
  }, [map, onMapClick])
  
  return null
}

// Komponen untuk draggable marker dengan warna biru
function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]
  onPositionChange: (lat: number, lon: number) => void 
}) {
  const [draggedPosition, setDraggedPosition] = useState(position)
  const [icon, setIcon] = useState<any>(null)

  useEffect(() => {
    setDraggedPosition(position)
  }, [position])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const L = require("leaflet")
      const blueIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      setIcon(blueIcon)
    }
  }, [])

  const eventHandlers = {
    dragend: (e: any) => {
      const marker = e.target
      const newPosition = marker.getLatLng()
      const lat = newPosition.lat
      const lon = newPosition.lng
      setDraggedPosition([lat, lon])
      onPositionChange(lat, lon)
    },
  }

  if (!icon) return null

  return (
    <Marker
      {...({
        position: draggedPosition,
        draggable: true,
        icon: icon,
        eventHandlers: eventHandlers,
      } as any)}
      />
  )
}

export function DudiFormMap({ 
  address, 
  onAddressChange, 
  onLocationChange,
  initialLatitude,
  initialLongitude 
}: DudiFormMapProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // Set initial position dari props atau default Malang
  const defaultPosition: [number, number] = [-7.983908, 112.621391]
  const initialPosition: [number, number] = 
    (initialLatitude && initialLongitude) 
      ? [initialLatitude, initialLongitude] 
      : defaultPosition
  
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(initialPosition)
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialPosition)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync address dengan searchQuery saat address berubah dari luar
  useEffect(() => {
    if (address && address !== searchQuery) {
      setSearchQuery(address)
    }
  }, [address])

  // Update marker position saat initialLatitude/initialLongitude berubah (saat edit)
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      const newPosition: [number, number] = [initialLatitude, initialLongitude]
      setMarkerPosition(newPosition)
      setMapCenter(newPosition)
    }
  }, [initialLatitude, initialLongitude])

  // Close dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Forward geocoding dengan Nominatim
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=id&addressdetails=1`,
        {
          headers: {
            "User-Agent": "MagangPortal/1.0",
          },
        }
      )
      const data: NominatimResult[] = await response.json()
      setSearchResults(data)
      setShowDropdown(data.length > 0)
    } catch (error) {
      console.error("Geocoding error:", error)
      setSearchResults([])
      setShowDropdown(false)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddress(searchQuery)
      }, 500)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchAddress])

  // Handle pilih hasil pencarian
  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    
    setMarkerPosition([lat, lon])
    setMapCenter([lat, lon])
    setSearchQuery(result.display_name)
    onAddressChange(result.display_name)
    setShowDropdown(false)
    
    if (onLocationChange) {
      onLocationChange(lat, lon)
    }
  }

  // Reverse geocoding
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    setIsReverseGeocoding(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "MagangPortal/1.0",
          },
        }
      )
      const data = await response.json()
      if (data.display_name) {
        const addressName = data.display_name
        setSearchQuery(addressName)
        onAddressChange(addressName)
      }
      // Pastikan onLocationChange dipanggil setelah reverse geocoding
      if (onLocationChange) {
        onLocationChange(lat, lon)
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      // Tetap panggil onLocationChange meskipun reverse geocoding gagal
      if (onLocationChange) {
        onLocationChange(lat, lon)
      }
    } finally {
      setIsReverseGeocoding(false)
    }
  }, [onAddressChange, onLocationChange])

  // Handle klik di map
  const handleMapClick = useCallback((e: any) => {
    const { lat, lng } = e.latlng
    setMarkerPosition([lat, lng])
    // reverseGeocode akan memanggil onLocationChange
    reverseGeocode(lat, lng)
  }, [reverseGeocode])

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback((lat: number, lon: number) => {
    setMarkerPosition([lat, lon])
    // reverseGeocode akan memanggil onLocationChange
    reverseGeocode(lat, lon)
  }, [reverseGeocode])

  if (!mounted) {
    return (
      <div className="space-y-2">
        <Label htmlFor="alamat">Alamat Lengkap</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id="alamat"
            placeholder="Masukkan alamat perusahaan"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              onAddressChange(e.target.value)
            }}
            className="pr-10"
          />
        </div>
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <p className="text-gray-500">Memuat peta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="alamat">Alamat Lengkap</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="alamat"
          placeholder="Masukkan alamat perusahaan (min 3 huruf untuk pencarian)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            onAddressChange(e.target.value)
          }}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowDropdown(true)
            }
          }}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        {/* Dropdown hasil pencarian */}
        {showDropdown && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {isSearching && (
              <div className="p-3 text-sm text-gray-500 text-center">
                Mencari...
              </div>
            )}
            {!isSearching &&
              searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {result.display_name}
                  </p>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Status */}
      {isReverseGeocoding && (
        <p className="text-sm text-gray-500">
          Mengambil alamat dari lokasi...
        </p>
      )}

      {/* Map */}
      <div className="w-full h-64 md:h-80 rounded-md overflow-hidden border border-gray-200">
        <MapContainer
          {...({
            center: mapCenter,
            zoom: 13,
            style: { height: "100%", width: "100%", zIndex: 0 },
            scrollWheelZoom: true,
            className: "z-0",
          } as any)}
        >
          <MapUpdater center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
          <TileLayer
            {...({
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            } as any)}
          />
          <DraggableMarker 
            position={markerPosition} 
            onPositionChange={handleMarkerDragEnd}
          />
        </MapContainer>
      </div>
      
      <p className="text-xs text-gray-500">
        Klik atau seret marker untuk mengubah lokasi
      </p>
    </div>
  )
}

