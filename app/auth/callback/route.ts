import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Determine correct base URL (handles Vercel reverse-proxy headers)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
  const host = request.headers.get('host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  let redirectBase = origin
  if (forwardedHost && !isLocalEnv) {
    redirectBase = `${forwardedProto}://${forwardedHost}`
  } else if (process.env.NEXT_PUBLIC_SITE_URL && !isLocalEnv) {
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    if (!siteUrl.startsWith('http')) siteUrl = `https://${siteUrl}`
    redirectBase = siteUrl
  } else if (host && !isLocalEnv && !host.includes('localhost')) {
    redirectBase = `${forwardedProto}://${host}`
  }

  // Security: only allow relative URLs for redirection to prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${safeNext}`)
    }
  }

  // Return the user to an error or login page with an error state
  return NextResponse.redirect(`${redirectBase}/login?error=auth_failed`)
}
