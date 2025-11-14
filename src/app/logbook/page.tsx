"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderLogbook } from "@/components/logbook/site-header-logbook"
import { SectionCardsLogbook } from "@/components/logbook/section-cards-logbook"
import { LogbookGuru } from "@/components/logbook/guru/LogbookGuru"
import { LogbookSiswa } from "@/components/logbook/siswa/LogbookSiswa"
import { RoleSwitcher } from "@/components/RoleSwitcher"

export default function Page() {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#f5f9ff]">
        <SiteHeaderLogbook />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-3 py-3 md:gap-4 md:py-4">
              <RoleSwitcher
                guruContent={
                  <>
                    <SectionCardsLogbook />
                    <LogbookGuru />
                  </>
                }
                siswaContent={<LogbookSiswa />}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
