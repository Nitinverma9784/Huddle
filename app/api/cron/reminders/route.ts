import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { renderInviteHtml, renderInviteText } from '@/lib/email/templates'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ message: 'Resend API key not configured, skipping cron' })
    }

    const resend = new Resend(resendApiKey)
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    for (const session of sessions) {
      const invites = session.invites || []
      const quiz = session.quizzes as { title?: string } | null
      const joinUrl = `${siteUrl}/room/${session.room_code}`

      for (const invite of invites) {
        if (invite.status === 'sent') {
          await resend.emails.send({
            from: 'Huddle Reminders <reminders@huddle.live>',
            to: invite.email,
            subject: `Reminder: ${quiz?.title || 'Quiz'} is starting soon!`,
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
          remindersSent++
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      checkedSessions: sessions.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown cron error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
