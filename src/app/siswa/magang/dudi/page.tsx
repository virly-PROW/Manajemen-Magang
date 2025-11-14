import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderMagang } from "@/components/magang/site-header-magang"
import MagangTable from "@/components/magang/MagangTable"

export default function Page() {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#f5f9ff]">
        <SiteHeaderMagang />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-2 py-2">
              <MagangTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}
