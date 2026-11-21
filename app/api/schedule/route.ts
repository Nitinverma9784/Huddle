import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateRoomCode } from '@/lib/room-code'
import { renderInviteHtml, renderInviteText } from '@/lib/email/templates'
import { generateIcsCalendar } from '@/lib/email/ics'
import { sendEmailViaSendgrid } from '@/lib/email/sendgrid'

// Run on Vercel Edge Runtime for maximum performance and global low-latency execution
export const runtime = 'edge'

/**
 * POST /api/schedule
 * Edge Function to schedule a live quiz session and dispatch SendGrid invitations with ICS calendar attachments.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { quizId, scheduledAt, timezone = 'UTC', emails = [] } = body

    if (!quizId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required parameters: quizId and scheduledAt' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Fetch Quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, owner_id')
      .eq('id', quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // 2. Fetch Host profile if available
    let hostName = 'Huddle Host'
    if (quiz.owner_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', quiz.owner_id)
        .single()
      if (profile?.name) hostName = profile.name
    }

    // 3. Create scheduled session
    const roomCode = generateRoomCode()
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        quiz_id: quiz.id,
        host_id: quiz.owner_id,
        room_code: roomCode,
        status: 'scheduled',
        scheduled_at: scheduledAt,
        timezone,
      })
      .select('id, room_code')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || 'Failed to create scheduled session' },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const joinUrl = `${siteUrl}/room/${session.room_code}`

    // 4. Sanitize and insert invites
    const uniqueEmails: string[] = Array.from(
      new Set(
        (emails as string[])
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    )

    if (uniqueEmails.length > 0) {
      const invitesData = uniqueEmails.map((email) => ({
        session_id: session.id,
        email,
        status: 'sent',
      }))
      await supabase.from('invites').insert(invitesData)

      // 5. Generate ICS calendar attachment & dispatch via SendGrid API
      try {
        const icsContent = await generateIcsCalendar({
          title: quiz.title,
          description: `Live multiplayer quiz hosted on Huddle.`,
          startIso: scheduledAt,
          url: joinUrl,
          organizerName: hostName,
        })

        // Edge-compatible base64 encoding
        const icsBase64 =
          typeof Buffer !== 'undefined'
            ? Buffer.from(icsContent).toString('base64')
            : btoa(unescape(encodeURIComponent(icsContent)))

        for (const recipient of uniqueEmails) {
          await sendEmailViaSendgrid({
            to: recipient,
            subject: `Invitation: ${quiz.title} on Huddle`,
            html: renderInviteHtml({
              quizTitle: quiz.title,
              hostName,
              scheduledAt,
              timezone,
              joinUrl,
            }),
            text: renderInviteText({
              quizTitle: quiz.title,
              hostName,
              scheduledAt,
              timezone,
              joinUrl,
            }),
            attachments: [
              {
                filename: 'invite.ics',
                content: icsBase64,
                type: 'text/calendar',
              },
            ],
          })
        }
      } catch (emailErr) {
        console.warn('[Edge Schedule] SendGrid dispatch warning (non-fatal):', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      roomCode: session.room_code,
      joinUrl,
      invitedCount: uniqueEmails.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Edge Scheduling Error'
    console.error('[Edge Schedule Error]:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/schedule
 * On-demand Vercel Edge reminder check.
 * Dispatches SendGrid reminders for sessions starting in the next 24 hours without requiring any background cron job!
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionIdParam = url.searchParams.get('session_id')

    const supabase = createAdminClient()
    const now = new Date()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    let sessionsToProcess: Array<{
      id: string
      room_code: string
      scheduled_at: string
      timezone: string
      quizzes: { title?: string } | null
      invites?: Array<{ id: string; email: string; status: string }>
    }> = []

    // 1. Auto-start any scheduled sessions that have reached scheduled_at
    const { data: dueSessions } = await supabase
      .from('sessions')
      .select('id, room_code, quiz_id, scheduled_at, quizzes(default_timer_seconds)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())

    let autoStartedSessions = 0
    if (dueSessions && dueSessions.length > 0) {
      for (const dueSession of dueSessions) {
        const { data: questions } = await supabase
          .from('questions')
          .select('id, text, options, timer_seconds, order_index')
          .eq('quiz_id', dueSession.quiz_id)
          .order('order_index', { ascending: true })

        if (questions && questions.length > 0) {
          const startedAt = new Date().toISOString()
          await supabase
            .from('sessions')
            .update({
              status: 'live',
              current_question_index: 0,
              question_started_at: startedAt,
              updated_at: startedAt,
            })
            .eq('id', dueSession.id)

          const q0 = questions[0]
          const q0Options = Array.isArray(q0.options)
            ? q0.options
            : typeof q0.options === 'string'
            ? JSON.parse(q0.options)
            : []
          const defaultTimer =
            (dueSession.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds || 20
          const timerSec = q0.timer_seconds || defaultTimer

          const channel = supabase.channel(`room:${dueSession.room_code.toUpperCase().trim()}`)
          await channel.send({
            type: 'broadcast',
            event: 'question_started',
            payload: {
              questionId: q0.id,
              questionIndex: 0,
              questionText: q0.text,
              options: q0Options,
              timerSeconds: timerSec,
              startedAt,
            },
          })
          await supabase.removeChannel(channel)
          autoStartedSessions++
        }
      }
    }

    if (sessionIdParam) {
      // Check reminders for a specific session
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          room_code,
          scheduled_at,
          timezone,
          quizzes ( title ),
          invites ( id, email, status )
        `)
        .eq('id', sessionIdParam)
        .single()

      if (!error && data) {
        sessionsToProcess = [data as any]
      }
    } else {
      // Find all sessions starting within the next 24 hours
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
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

      if (!error && data) {
        sessionsToProcess = data as any[]
      }
    }

    let remindersSent = 0
    const updatedInviteIds: string[] = []

    for (const session of sessionsToProcess) {
      const invites = session.invites || []
      const quiz = session.quizzes
      const joinUrl = `${siteUrl}/room/${session.room_code}`

      for (const invite of invites) {
        if (invite.status === 'sent') {
          const res = await sendEmailViaSendgrid({
            to: invite.email,
            subject: `Reminder: "${quiz?.title || 'Live Quiz'}" is starting soon on Huddle!`,
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
            updatedInviteIds.push(invite.id)
          }
        }
      }
    }

    // Mark sent invites as reminded to prevent duplicate sends
    if (updatedInviteIds.length > 0) {
      await supabase
        .from('invites')
        .update({ status: 'reminded' })
        .in('id', updatedInviteIds)
    }

    return NextResponse.json({
      success: true,
      runtime: 'vercel-edge',
      autoStartedSessions,
      remindersSent,
      checkedSessions: sessionsToProcess.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Edge reminder dispatch failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
