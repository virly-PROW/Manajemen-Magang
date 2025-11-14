"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  IconDashboard,
  IconBuildingSkyscraper,
  IconSchool,
  IconBook,
  IconInnerShadowTop,
} from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useRole } from "@/contexts/RoleContext" // ✅ ambil context
import { useSession } from "next-auth/react"

// Dynamic import untuk menghindari hydration mismatch
const NavMain = dynamic(() => import("@/components/nav-main").then(mod => ({ default: mod.NavMain })), {
  ssr: false,
  loading: () => <div className="flex flex-col gap-2 p-2">Loading...</div>
})

const defaultUser = {
  name: "SMK Brantas Karangkates",
  email: "virlyyannisa@gmail.com",
  avatar: "/avatars/shadcn.jpg",
}

const data = {
  navMainGuru: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "DUDI",
      url: "/dudi",
      icon: IconBuildingSkyscraper,
    },
    {
      title: "Magang",
      url: "/magang",
      icon: IconSchool,
    },
    {
      title: "Logbook",
      url: "/logbook",
      icon: IconBook,
    },
  ],
  navMainSiswa: [
    {
      title: "Dashboard",
      url: "/siswa",
      icon: IconDashboard,
    },
    {
      title: "DUDI",
      url: "/siswa/dudi",
      icon: IconBuildingSkyscraper,
    },
    {
      title: "Magang",
      url: "/siswa/magang",
      icon: IconSchool,
    },
    {
      title: "Logbook",
      url: "/siswa/logbook",
      icon: IconBook,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useRole() // ✅ ambil role global
  const { data: session } = useSession()
  const navItems = role === "guru" ? data.navMainGuru : data.navMainSiswa
  
  // Use session data if available, otherwise use default
  const user = session?.user ? {
    name: session.user.name || defaultUser.name,
    email: session.user.email || defaultUser.email,
    avatar: session.user.image || defaultUser.avatar,
  } : defaultUser

  return (
    <Sidebar collapsible="offcanvas" {...props} suppressHydrationWarning>
      {/* Sidebar Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Magang</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
