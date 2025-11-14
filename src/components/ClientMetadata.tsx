"use client"

import { useEffect } from "react"

export function ClientMetadata() {
  useEffect(() => {
    // Set document title
    document.title = "Magang Management"
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', 'Aplikasi Manajemen Magang dan Logbook PKL')
    
    // Set theme color
    let themeColor = document.querySelector('meta[name="theme-color"]')
    if (!themeColor) {
      themeColor = document.createElement('meta')
      themeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(themeColor)
    }
    themeColor.setAttribute('content', '#3b82f6')
    
    // Set viewport
    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.head.appendChild(viewport)
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1')
    
    // Set manifest
    let manifest = document.querySelector('link[rel="manifest"]')
    if (!manifest) {
      manifest = document.createElement('link')
      manifest.setAttribute('rel', 'manifest')
      document.head.appendChild(manifest)
    }
    manifest.setAttribute('href', '/manifest.json')
    
    // Set apple-mobile-web-app-capable
    let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]')
    if (!appleCapable) {
      appleCapable = document.createElement('meta')
      appleCapable.setAttribute('name', 'apple-mobile-web-app-capable')
      document.head.appendChild(appleCapable)
    }
    appleCapable.setAttribute('content', 'yes')
    
    // Set apple-mobile-web-app-status-bar-style
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta')
      appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
      document.head.appendChild(appleStatusBar)
    }
    appleStatusBar.setAttribute('content', 'default')
    
    // Set apple-mobile-web-app-title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (!appleTitle) {
      appleTitle = document.createElement('meta')
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title')
      document.head.appendChild(appleTitle)
    }
    appleTitle.setAttribute('content', 'Magang Management')
  }, [])
  
  return null
}

