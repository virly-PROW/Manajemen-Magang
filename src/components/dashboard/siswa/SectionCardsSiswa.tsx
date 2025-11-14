import {
  IconUsers,
  IconBuildingSkyscraper,
  IconSchool,
  IconBook,
} from "@tabler/icons-react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCardsSiswa() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconUsers className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Status Magang</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            Aktif
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Status Magang Anda</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconBuildingSkyscraper className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Perusahaan</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            PT. ABC
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Tempat Magang Anda</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconSchool className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Durasi Magang</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            30 Hari
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Sisa Waktu Magang</div>
        </CardFooter>
      </Card>

      <Card className="@container/card border-[#dbe7ff] h-full flex flex-col">
        <CardHeader className="flex flex-col items-start space-y-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 h-8 min-h-[2rem]">
            <IconBook className="h-6 w-6 text-[#2f6fed] shrink-0" />
            <CardDescription className="line-clamp-2">Logbook Saya</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl mt-auto">
            15
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto min-h-[3rem] flex items-center">
          <div className="text-slate-600">Total Laporan Saya</div>
        </CardFooter>
      </Card>
    </div>
  )
}











