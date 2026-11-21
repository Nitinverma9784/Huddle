'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Menu, X, LayoutDashboard, LogOut, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export function Navbar({ onOpenJoin }: { onOpenJoin?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      toast.success('Signed out successfully')
      router.refresh()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-900/20 dark:border-purple-900/30 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/huddle-logo.png"
              alt="Huddle"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform select-none pointer-events-none"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group">
              <span>Product</span>
              <ChevronDown className="h-3.5 w-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              For teams
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {onOpenJoin && (
            <button
              onClick={onOpenJoin}
              className="hidden sm:inline-flex text-xs font-semibold text-purple-400 dark:text-purple-300 hover:text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer"
            >
              Enter Code
            </button>
          )}

          {/* Theme Toggle Sun / Moon Icon */}
          <ThemeToggle />

          {/* Logged-In User View vs Guest View */}
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-xs font-medium text-foreground/80 hover:text-foreground px-3 py-2 rounded-lg transition-colors hidden sm:inline-block"
              >
                Dashboard
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none hover:ring-2 hover:ring-primary/40 transition-all p-0.5 cursor-pointer">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url || ''}
                      alt={user.user_metadata?.full_name || 'User'}
                    />
                    <AvatarFallback className="text-xs font-bold">
                      {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl">
                  <DropdownMenuGroup>
                    <div className="px-2.5 py-1.5 text-xs">
                      <p className="font-bold text-foreground truncate">
                        {user.user_metadata?.full_name || 'Host'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push('/dashboard')}
                    className="cursor-pointer gap-2 text-xs py-2"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 text-xs py-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href="/dashboard"
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-md shadow-purple-600/25 active:scale-95 transition-all hidden sm:inline-flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-medium text-foreground/80 hover:text-foreground px-3 py-2 rounded-lg transition-colors hidden sm:inline-block"
              >
                Log in
              </Link>

              <Link
                href="/login"
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-md shadow-purple-600/25 active:scale-95 transition-all"
              >
                Get started
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-purple-900/20 bg-background/95 backdrop-blur-2xl px-6 py-4 space-y-3 text-sm">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Product
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            For teams
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 text-muted-foreground hover:text-foreground"
          >
            Pricing
          </a>
          <div className="pt-2 flex flex-col gap-2">
            {onOpenJoin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenJoin()
                }}
                className="w-full text-center text-xs font-semibold py-2 rounded-xl border border-purple-500/30 text-purple-400"
              >
                Enter Game Code
              </button>
            )}

            {user ? (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2.5 px-1 py-1">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url || ''}
                      alt={user.user_metadata?.full_name || 'User'}
                    />
                    <AvatarFallback className="text-xs font-bold">
                      {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs min-w-0">
                    <p className="font-bold truncate">{user.user_metadata?.full_name || 'Host'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-xs font-semibold py-2 rounded-xl bg-purple-600 text-white block"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="w-full text-center text-xs font-medium py-2 rounded-xl text-destructive hover:bg-destructive/10 border border-destructive/20 block"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-xs font-semibold py-2 rounded-xl bg-purple-600 text-white block"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
