import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaSendgrid } from '@/lib/email/sendgrid'
import { renderInviteHtml, renderInviteText } from '@/lib/email/templates'

// Run on Vercel Edge Runtime
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    // 1. Check for sessions scheduled in the next 24 hours
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        room_code,
        scheduled_at,
        timezone,
        quizzes ( title ),
        invites ( id, email, status )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', next24Hours)

    if (error || !sessions) {
      return NextResponse.json({ error: error?.message || 'Failed to query sessions' }, { status: 500 })
    }

    let remindersSent = 0
    const remindedInviteIds: string[] = []
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    for (const session of sessions) {
      const invites = session.invites || []
      const quiz = session.quizzes as { title?: string } | null
      const joinUrl = `${siteUrl}/room/${session.room_code}`

      for (const invite of invites) {
        if (invite.status === 'sent') {
          const res = await sendEmailViaSendgrid({
            to: invite.email,
            subject: `Reminder: "${quiz?.title || 'Quiz'}" is starting soon on Huddle!`,
            html: renderInviteHtml({
              quizTitle: quiz?.title || 'Live Quiz',
              hostName: 'Your Host',
              scheduledAt: session.scheduled_at,
              timezone: session.timezone || 'UTC',
              joinUrl,
            }),
            text: renderInviteText({
              quizTitle: quiz?.title || 'Live Quiz',
              hostName: 'Your Host',
              scheduledAt: session.scheduled_at,
              timezone: session.timezone || 'UTC',
              joinUrl,
            }),
          })

          if (res.success) {
            remindersSent++
            remindedInviteIds.push(invite.id)
          }
        }
      }
    }

    if (remindedInviteIds.length > 0) {
      await supabase
        .from('invites')
        .update({ status: 'reminded' })
        .in('id', remindedInviteIds)
    }

    return NextResponse.json({
      success: true,
      runtime: 'vercel-edge',
      provider: 'sendgrid',
      remindersSent,
      checkedSessions: sessions.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Edge reminder error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
