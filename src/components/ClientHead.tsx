"use client"

import { useEffect } from "react"

export function ClientHead() {
  useEffect(() => {
    // Ensure metadata is set (in case it's not in the initial HTML)
    // This runs only on client-side after hydration
    
    // Set document title if not already set
    if (document.title !== "Magang Management") {
      document.title = "Magang Management"
    }
    
    // Ensure meta tags exist (they should already be in head from layout.tsx)
    // This is just a safety check for client-side navigation
    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', name)
        document.head.appendChild(meta)
      }
      if (meta.getAttribute('content') !== content) {
        meta.setAttribute('content', content)
      }
    }
    
    ensureMeta('description', 'Aplikasi Manajemen Magang dan Logbook PKL')
    ensureMeta('theme-color', '#3b82f6')
    ensureMeta('apple-mobile-web-app-capable', 'yes')
    ensureMeta('apple-mobile-web-app-status-bar-style', 'default')
    ensureMeta('apple-mobile-web-app-title', 'Magang Management')
    
    // Ensure manifest link exists
    let linkManifest = document.querySelector('link[rel="manifest"]')
    if (!linkManifest) {
      linkManifest = document.createElement('link')
      linkManifest.setAttribute('rel', 'manifest')
      linkManifest.setAttribute('href', '/manifest.json')
      document.head.appendChild(linkManifest)
    }
  }, [])
  
  return null
}

