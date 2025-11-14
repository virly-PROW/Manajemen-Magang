"use client" 
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { RoleSwitcher } from "@/components/RoleSwitcher"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DashboardSiswa } from "@/components/dashboard/siswa/DashboardSiswa"
import { DashboardGuru } from "@/components/dashboard/guru/DashboardGuru"
import { SidebarInset } from "@/components/ui/sidebar"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
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
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

              <RoleSwitcher
                guruContent={<DashboardGuru />}
                siswaContent={
                  <>
                    <DashboardSiswa />
                    <div className="px-4 lg:px-6">
                      <ChartAreaInteractive />
                    </div>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
