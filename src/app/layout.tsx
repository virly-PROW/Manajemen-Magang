"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import "./globals.css"
import { Toaster } from "sonner"
import { RoleProvider } from "@/contexts/RoleContext"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ClientHead } from "@/components/ClientHead"
import { Providers } from "@/app/providers"

// Load fonts dynamically to avoid blocking
const loadFonts = () => {
  if (typeof window !== "undefined") {
    // Load Geist Sans
    const geistSansLink = document.createElement("link")
    geistSansLink.rel = "stylesheet"
    geistSansLink.href =
      "https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap"
    document.head.appendChild(geistSansLink)

    // Load Geist Mono
    const geistMonoLink = document.createElement("link")
    geistMonoLink.rel = "stylesheet"
    geistMonoLink.href =
      "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100;200;300;400;500;600;700;800;900&display=swap"
    document.head.appendChild(geistMonoLink)

    // Set CSS variables for fonts
    document.documentElement.style.setProperty("--font-geist-sans", "'Geist', sans-serif")
    document.documentElement.style.setProperty("--font-geist-mono", "'Geist Mono', monospace")
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()

  // Deteksi apakah halaman login/register atau halaman detail magang (public)
  const isAuthPage =
    pathname?.startsWith("/login") || 
    pathname?.startsWith("/register") || 
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/magang/detail/"); 

  useEffect(() => {
    loadFonts()

    const enablePWAInDev =
      (process.env.NEXT_PUBLIC_ENABLE_PWA ?? process.env.ENABLE_PWA) === "true"

    if (process.env.NODE_ENV === "development" && !enablePWAInDev) {
      const cleanupServiceWorker = async () => {
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(registrations.map((r) => r.unregister()))
            console.log("Service workers unregistered in development mode")
          } catch (error) {
            console.warn("Error unregistering service workers:", error)
          }
        }

        if (typeof caches !== "undefined") {
          try {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map((cache) => caches.delete(cache)))
            console.log("All caches cleared in development mode")
          } catch (error) {
            console.warn("Error clearing caches:", error)
          }
        }
      }

      cleanupServiceWorker()

      const handleFocus = () => {
        if (!enablePWAInDev) cleanupServiceWorker()
      }
      window.addEventListener("focus", handleFocus)

      return () => window.removeEventListener("focus", handleFocus)
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta
          name="description"
          content="Aplikasi Manajemen Magang dan Logbook PKL"
        />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="Magang Management"
        />
        <title>Magang Management</title>
      </head>

      <body className="antialiased" suppressHydrationWarning>
        <ClientHead />
        <Providers>
          <RoleProvider>
            {isAuthPage ? (
              // Halaman login/register — tanpa sidebar, biar bisa center
              <>
                {children}
                <Toaster position="top-right" richColors />
              </>
            ) : (
              // Halaman lain — pakai sidebar layout
              <SidebarProvider>
                {children}
                <Toaster position="top-right" richColors />
              </SidebarProvider>
            )}
          </RoleProvider>
        </Providers>
      </body>
    </html>
  )
}
