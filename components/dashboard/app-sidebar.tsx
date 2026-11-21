'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { UserNav } from './user-nav'
import {
  LayoutList,
  Sparkles,
  Calendar,
  BarChart3,
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
  const searchParams = useSearchParams()
  const currentTab = searchParams?.get('tab')

  interface NavItem {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
    active: boolean
    disabled?: boolean
    badge?: string
  }

  const items: NavItem[] = [
    {
      title: 'Quizzes',
      url: '/dashboard',
      icon: LayoutList,
      active:
        (pathname === '/dashboard' && (!currentTab || currentTab === 'quizzes')) ||
        pathname.startsWith('/dashboard/quizzes'),
    },
    {
      title: 'Scheduled Sessions',
      url: '/dashboard?tab=upcoming',
      icon: Calendar,
      active: pathname === '/dashboard' && currentTab === 'upcoming',
    },
    {
      title: 'Analytics & Results',
      url: '/dashboard?tab=past',
      icon: BarChart3,
      active:
        pathname.startsWith('/dashboard/analytics') ||
        (pathname === '/dashboard' && currentTab === 'past'),
    },
  ]

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="border-b px-4 py-4 bg-muted/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="/huddle-logo.png"
            alt="Huddle"
            className="h-9 w-auto object-contain select-none"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <div
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground/50 cursor-not-allowed select-none bg-muted/20 border border-transparent"
                      title="Coming Soon"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className="h-4 w-4 shrink-0 opacity-40" />
                        <span className="font-medium text-xs truncate">{item.title}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-muted/80 text-muted-foreground border border-border/40 shrink-0 uppercase tracking-wider"
                      >
                        {item.badge}
                      </Badge>
                    </div>
                  ) : (
                    <SidebarMenuButton
                      render={
                        <Link href={item.url} className="gap-2.5">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium text-xs">{item.title}</span>
                        </Link>
                      }
                      isActive={item.active}
                      className="rounded-xl px-3 py-2 text-xs transition-colors data-active:bg-primary/10 data-active:text-primary data-active:font-bold"
                    />
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2.5 bg-muted/10">
        <UserNav user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
