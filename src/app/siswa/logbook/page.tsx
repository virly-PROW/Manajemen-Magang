import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderLogbook } from "@/components/logbook/site-header-logbook"
import { LogbookSiswa } from "@/components/logbook/siswa/LogbookSiswa"

export default function Page() {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#f5f9ff]">
        <SiteHeaderLogbook />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-3 py-3 md:gap-4 md:py-4">
              <LogbookSiswa />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
