"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderDudi } from "@/components/dudi/site-header-dudi"
import { SectionCardsDudi } from "@/components/dudi/section-cards-dudi"
import { DudiTableSiswa } from "@/components/dudi/DudiTableSiswa"
import { useRole } from "@/contexts/RoleContext"
import supabase from "@/lib/supabaseClient"

export default function Page() {
  const { role } = useRole()
  const [currentNisn, setCurrentNisn] = useState<string>("")

  // Get student NISN when in siswa mode
  useEffect(() => {
    if (role === "siswa") {
      const fetchStudentNisn = async () => {
        try {
          // Get the first student (similar to LogbookSiswa approach)
          const { data: siswaData, error } = await supabase
            .from("siswa")
            .select("nisn")
            .limit(1)
            .single()

          if (error) {
            console.error("Error fetching student NISN:", error)
            // If no student exists, create a test student
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
    <>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#f5f9ff]">
        <SiteHeaderDudi />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
           <div className="flex flex-col gap-2 py-1 md:gap-4 md:py-2">
              {/* Statistics Cards */}
              <SectionCardsDudi />
              
              {/* DUDI Registration Table */}
              <DudiTableSiswa nisn={currentNisn} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
