import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = {
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    email: user.email,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  }

  return (
    <SidebarProvider className="bg-muted/40">
      <AppSidebar user={profile} />
      <SidebarInset className="bg-transparent p-2 sm:p-3 md:p-3.5 pl-0 md:pl-0">
        <div className="flex flex-col min-h-[calc(100vh-1.75rem)] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-xs overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <div className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Workspace
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-medium hidden sm:block">
              Host Console &bull; Live Multiplayer AI
            </div>
          </header>
          <div className="flex-1 p-5 sm:p-7 md:p-8 overflow-y-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
