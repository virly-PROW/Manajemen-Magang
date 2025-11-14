"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon?: Icon
  description?: string
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup suppressHydrationWarning>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            // Jika pathname adalah "/" dan item adalah Dashboard, maka aktif
            // Atau jika pathname sama dengan item.url
            const isActive = pathname === item.url || 
              (pathname === "/" && (item.url === "/dashboard" || item.url === "/siswa"))
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild suppressHydrationWarning isActive={isActive}>
                  <Link href={item.url} className="flex gap-2 items-start">
                    {item.icon && <item.icon className="w-5 h-5 mt-0.5 text-slate-700" />}
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-slate-800">{item.title}</span>
                      {/* ✅ deskripsi SELALU ada */}
                      <span className="text-xs text-slate-600">
                        {item.description ?? ""}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
