'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { UserNav } from './user-nav'
import {
  LayoutList,
  Sparkles,
  Calendar,
  BarChart3,
  PlayCircle,
} from 'lucide-react'

interface AppSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    avatar_url?: string | null
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  const items = [
    {
      title: 'Quizzes',
      url: '/dashboard',
      icon: LayoutList,
      active: pathname === '/dashboard' || pathname.startsWith('/dashboard/quizzes'),
    },
    {
      title: 'Scheduled Sessions',
      url: '/dashboard/scheduled',
      icon: Calendar,
      active: pathname.startsWith('/dashboard/scheduled'),
    },
    {
      title: 'Live Rooms',
      url: '/dashboard/rooms',
      icon: PlayCircle,
      active: pathname.startsWith('/dashboard/rooms'),
    },
    {
      title: 'Analytics & Results',
      url: '/dashboard/analytics',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/analytics'),
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="/huddle-logo.png"
            alt="Huddle"
            className="h-9 w-auto object-contain select-none"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    }
                    isActive={item.active}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <UserNav user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
