"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SiteHeaderMagang } from "@/components/magang/site-header-magang"
import { SectionCardsMagang } from "@/components/magang/section-cards-magang"
import MagangTable from "@/components/magang/MagangTable"
import { MagangSiswa } from "@/components/dashboard/siswa/MagangSiswa"
import { RoleSwitcher } from "@/components/RoleSwitcher"

export default function Page() {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#f5f9ff]">
        <SiteHeaderMagang />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-1">
            <div className="flex flex-col gap-2 py-2">
              <RoleSwitcher
                guruContent={
                  <>
                    <SectionCardsMagang />
                    <MagangTable />
                  </>
                }
                siswaContent={<MagangSiswa />}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
} 

// // Validasi NISN angka atau no_hp angka
// if (isNaN(Number(form.nisn))) {
//   toast.error("NISN harus berupa angka!")
//   return
// }

// // Cek kosong
// if (!form.no_hp) {
//   toast.error("No HP tidak boleh kosong!");
//   return;
// }
 // cek dihit harus kurang dari 15
 // if(form.no_hp lenght > 14)
      //toast.error{"No hp tidak boleh lebih dari 14"}
      //return
      //} 