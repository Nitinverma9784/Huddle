'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { ChevronDown, Menu, X } from 'lucide-react'

export function Navbar({ onOpenJoin }: { onOpenJoin?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-900/20 dark:border-purple-900/30 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/huddle-logo.png"
              alt="Huddle"
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform select-none"
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
              className="hidden sm:inline-flex text-xs font-semibold text-purple-400 dark:text-purple-300 hover:text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
            >
              Enter Code
            </button>
          )}

          {/* Theme Toggle Sun / Moon Icon */}
          <ThemeToggle />

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
            <Link
              href="/login"
              className="w-full text-center text-xs font-semibold py-2 rounded-xl bg-purple-600 text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
