'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/landing/navbar'
import { JoinModal } from '@/components/landing/join-modal'
import {
  ArrowRight,
  Play,
  Zap,
  Users,
  BarChart3,
  CalendarDays
 
} from 'lucide-react'

// Realistic student & teacher avatar portraits matching the design
const SOCIAL_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces',
]

export default function HomePage() {
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <div
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).tagName === 'IMG') {
          e.preventDefault()
        }
      }}
      className="min-h-screen bg-[#fcfaff] dark:bg-[#07040d] text-foreground selection:bg-purple-500 selection:text-white relative overflow-hidden transition-colors duration-300"
    >
      {/* Background Radial Glow Effects */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Hero Top-Right Glow */}
        <div className="absolute -top-32 right-[-10%] w-[650px] h-[650px] rounded-full bg-purple-400/20 blur-[130px] dark:bg-purple-700/25" />
        {/* Features Center-Left Glow */}
        <div className="absolute top-[28%] -left-32 w-[600px] h-[600px] rounded-full bg-violet-400/15 blur-[140px] dark:bg-violet-600/20" />
        {/* How It Works Center-Right Glow */}
        <div className="absolute top-[52%] -right-32 w-[650px] h-[650px] rounded-full bg-purple-400/15 blur-[140px] dark:bg-purple-600/20" />
        {/* CTA Bottom-Left Glow */}
        <div className="absolute bottom-10 left-[-5%] w-[600px] h-[600px] rounded-full bg-fuchsia-400/15 blur-[140px] dark:bg-fuchsia-600/20" />
      </div>

      {/* Navigation Bar */}
      <Navbar onOpenJoin={() => setJoinModalOpen(true)} />

      <main className="relative z-10">
        {/* =========================================================================
            SECTION 1: HERO
        ========================================================================== */}
        <section className="relative overflow-hidden w-full pt-6 sm:pt-10 pb-16 sm:pb-24">
          <div className="w-full pl-4 sm:pl-8 lg:pl-[max(2rem,calc((100vw-80rem)/2))] pr-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">
              {/* Hero Left Content */}
              <div className="lg:col-span-6 xl:col-span-5 space-y-7 text-center lg:text-left z-10 py-4 max-w-xl lg:max-w-none">
                {/* Main Headline */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08]">
                  <span className="text-slate-950 dark:text-white">Bring everyone</span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 dark:from-purple-400 dark:via-fuchsia-400 dark:to-purple-500">
                    into the game.
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Create quizzes with AI, host live games, and see who comes out on top.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
                  <Link
                    href={isLoggedIn ? '/dashboard' : '/login'}
                    className="px-6 py-3.5 rounded-full font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-xl shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-2 group"
                  >
                    <span>{isLoggedIn ? 'Go to Dashboard' : 'Create a Quiz'}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href="#how-it-works"
                    className="px-6 py-3.5 rounded-full font-medium text-sm text-slate-800 dark:text-white bg-white dark:bg-[#19112e] hover:bg-slate-100 dark:hover:bg-[#231840] border border-slate-200 dark:border-white/10 active:scale-95 transition-all flex items-center gap-2.5 shadow-md"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>See how it works</span>
                  </a>
                </div>
              </div>

              {/* Hero Right Graphic - Wave touching the right border with natural smooth lighting */}
              <div className="lg:col-span-6 xl:col-span-7 flex justify-end items-center pr-0 relative">
                {/* Soft natural radial glow behind quiz and trophy, non-squarish */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-500/20 dark:bg-purple-600/25 rounded-full blur-[130px] pointer-events-none -z-10" />
                <div className="relative w-full flex justify-end translate-x-1 sm:translate-x-2 lg:translate-x-0">
                  <img
                    src="/hero-quiz-img.png"
                    alt="Huddle Live Quiz and Trophy"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl h-auto object-contain object-right hover:scale-[1.01] transition-transform duration-500 select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: POWERFUL FEATURES
        ========================================================================== */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Features Left: 3D Robot Mascot */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
              <div className="relative w-full max-w-sm lg:max-w-none">
                <img
                  src="/robot-mascot-img.png"
                  alt="Huddle AI Robot Mascot"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(168,85,247,0.35)] animate-float select-none will-change-transform hover:scale-[1.02] transition-transform duration-300 pointer-events-none"
                />
              </div>
            </div>

            {/* Features Right: Heading & 2x2 Feature Cards */}
            <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
              <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
           
                  <span>Powerful Features</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
                  Everything you need to host a perfect quiz
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
                  From AI-powered generation to real-time leaderboards, Huddle has it all.
                </p>
              </div>

              {/* 4 Feature Cards (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Feature 1 */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#120b24]/80 border border-purple-200 dark:border-purple-500/15 hover:border-purple-400 dark:hover:border-purple-500/35 shadow-sm hover:shadow-md transition-all space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
                    <Zap className="h-4 w-4 fill-current" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">AI Quiz Generation</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Turn any topic, file or prompt into a stunning quiz.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#120b24]/80 border border-purple-200 dark:border-purple-500/15 hover:border-purple-400 dark:hover:border-purple-500/35 shadow-sm hover:shadow-md transition-all space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Live Multiplayer</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Let friends, students or teammates join instantly.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#120b24]/80 border border-purple-200 dark:border-purple-500/15 hover:border-purple-400 dark:hover:border-purple-500/35 shadow-sm hover:shadow-md transition-all space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Real-time Results</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Track scores and celebrate winners in real-time.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#120b24]/80 border border-purple-200 dark:border-purple-500/15 hover:border-purple-400 dark:hover:border-purple-500/35 shadow-sm hover:shadow-md transition-all space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Schedule & Share</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Plan quizzes and invite players via link or email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: HOW IT WORKS
        ========================================================================== */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: How it Works Steps */}
            <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  <span>How It Works</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
                  Create. Host. <span className="text-purple-600 dark:text-purple-400">Play.</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto lg:mx-0">
                  Get started in just a few clicks and bring your quiz to life.
                </p>
              </div>

              {/* 3 Step List */}
              <div className="space-y-5 text-left max-w-md mx-auto lg:mx-0">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-purple-600/30 mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Create a Quiz</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Upload a file, type a prompt, or build manually.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-purple-600/30 mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Host a Live Room</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Share a link or code with players.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-purple-600/30 mt-0.5">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">See the Magic</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Watch the leaderboard update in real-time.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-xs text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-xl shadow-purple-600/25 active:scale-95 transition-all group"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Column: Dashboard Preview Graphic */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="relative w-full max-w-xl">
                <img
                  src="/dashboard-preview-img.png"
                  alt="Huddle Dashboard Preview"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-transform duration-500 select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: TESTIMONIAL & SOCIAL PROOF BAR
        ========================================================================== */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          {/* Top Pill: Trusted by 100k+ players */}
          <div className="flex justify-center -mb-3 relative z-10">
            <div className="px-4 py-1 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100 dark:bg-[#150d29] text-purple-800 dark:text-purple-200 text-xs font-semibold shadow-md">
              Trusted by 100k+ players
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="rounded-3xl bg-white/90 dark:bg-[#0e081e]/90 border border-purple-200 dark:border-purple-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl backdrop-blur-md transition-colors">
            {/* 7 Avatars Side by Side */}
            <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SOCIAL_AVATARS.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt="Active Student Player"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover ring-2 ring-purple-300 dark:ring-purple-500/30 shrink-0 select-none pointer-events-none"
                />
              ))}
            </div>

            {/* Testimonial Quote */}
            <div className="flex items-center gap-4 text-left border-t md:border-t-0 md:border-l border-purple-200 dark:border-purple-500/20 pt-4 md:pt-0 md:pl-8">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                alt="Aryan Mehta"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-500 shrink-0 select-none pointer-events-none"
              />
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium italic leading-snug">
                  &ldquo;Huddle made our college event so much more fun! Super easy to use and looks amazing.&rdquo;
                </p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold tracking-wide">
                  — Aryan Mehta, SPSU
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: HOST YOUR FIRST QUIZ TODAY (CTA)
        ========================================================================== */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Rocket Mascot Graphic on the Left */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xs sm:max-w-sm">
                <img
                  src="/rocket-clouds-img.png"
                  alt="Huddle Rocket Launch"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(168,85,247,0.35)] hover:scale-[1.03] transition-transform duration-500 select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Center/Right CTA Text & Button */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-200 text-xs font-semibold">
                <span>Ready to start?</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                Host your first quiz today
              </h2>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto lg:mx-0">
                It&apos;s free, fast, and takes less than a minute.
              </p>

              <div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-xl shadow-purple-600/30 active:scale-95 transition-all group"
                >
                  <span>Create a Quiz</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          FOOTER
      ========================================================================== */}
      <footer className="border-t border-slate-200 dark:border-purple-900/20 bg-slate-50 dark:bg-[#06030b] text-slate-600 dark:text-slate-400 py-12 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Logo & Tagline */}
            <div className="flex items-center gap-3">
              <img
                src="/huddle-logo.png"
                alt="Huddle"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="h-8 w-auto object-contain select-none pointer-events-none"
              />
              <div className="text-[11px] text-slate-500">Play. Learn. Grow.</div>
            </div>

            {/* Footer Navigation Links */}
            <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
              <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Product
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                How it works
              </a>
              <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
              <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Help
              </Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <a
                href="https://x.com/damnitin"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
                title="X (Twitter)"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/Nitinverma9784"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
                title="GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/nitinvermaaaa_/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Instagram"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/nitinvermaaa/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
                title="LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-purple-900/20 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>&copy; 2026 Huddle. All rights reserved.</div>
            <div className="flex items-center gap-1.5 font-medium">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{' '}
              <a
                href="https://github.com/Nitinverma9784"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 underline underline-offset-4 transition-colors"
              >
                Nitin
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Quick Join Game Modal */}
      <JoinModal open={joinModalOpen} onOpenChange={setJoinModalOpen} />
    </div>
  )
}
