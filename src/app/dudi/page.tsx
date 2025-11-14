"use client"
import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SiteHeaderDudi } from "@/components/dudi/site-header-dudi"
import { SectionCardsDudi } from "@/components/dudi/section-cards-dudi"
import { DudiTableGuru } from "@/components/dudi/DudiTableGuru"
import { DudiTableSiswa } from "@/components/dudi/DudiTableSiswa"
import { useRole } from "@/contexts/RoleContext"
import supabase from "@/lib/supabaseClient"
export default function Page() {
  const { role } = useRole()
  const [currentNisn, setCurrentNisn] = useState<string>("")
  useEffect(() => {
    if (role === "siswa") {
      const fetchStudentNisn = async () => {
        try {

          const { data: siswaData, error } = await supabase
            .from("siswa")
            .select("nisn")
            .limit(1)
            .single()

          if (error) {
            console.error("Error fetching student NISN:", error)

            const { data: newSiswa, error: createError } = await supabase
              .from("siswa")
              .insert([{
                nama: "Test Student",
                nisn: 1234567890,
                kelas: "XII",
                jurusan: "RPL"
              }])
              .select("nisn")
              .single()

            if (createError) {
              console.error("Error creating test student:", createError)
              return
            }

            setCurrentNisn(newSiswa.nisn.toString())
          } else {
            setCurrentNisn(siswaData.nisn.toString())
          }
        } catch (error) {
          console.error("Unexpected error:", error)
        }
      }

      fetchStudentNisn()
    }
  }, [role])
  return (
    <SidebarProvider
      // Provider untuk sidebar layout.
      style={
        {
          // Atur ukuran sidebar & header pakai variabel CSS.
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      {/* Sidebar aplikasi dengan style "inset". */}

      <SidebarInset>
        <SiteHeaderDudi />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-2 py-1 md:gap-4 md:py-2">
              {role === "guru" ? (
                <>
                  <SectionCardsDudi />
                  <DudiTableGuru />
                </>
              ) : (
                <>
                  <SectionCardsDudi />
                  <DudiTableSiswa nisn={currentNisn} />
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
