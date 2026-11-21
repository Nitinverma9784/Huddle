// Supabase Edge Function: schedule
// Runs on Supabase Edge Network (Deno runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const emailJsServiceId = Deno.env.get('EMAILJS_SERVICE_ID') ?? ''
    const emailJsTemplateId = Deno.env.get('EMAILJS_TEMPLATE_ID') ?? ''
    const emailJsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY') ?? Deno.env.get('EMAILJS_USER_ID') ?? ''
    const emailJsPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY') ?? ''
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000'

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const now = new Date()

    // ============================================================
    // 1. GET: Auto-start due sessions & send 24h reminders
    // ============================================================
    if (req.method === 'GET') {
      // 1.1 Auto-start any scheduled sessions that reached scheduled_at
      const { data: dueSessions, error: dueError } = await supabase
        .from('sessions')
        .select('id, room_code, quiz_id, scheduled_at, quizzes(default_timer_seconds)')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString())

      let autoStartedCount = 0
      if (!dueError && dueSessions && dueSessions.length > 0) {
        for (const session of dueSessions) {
          const { data: questions } = await supabase
            .from('questions')
            .select('id, text, options, timer_seconds, order_index')
            .eq('quiz_id', session.quiz_id)
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
              .eq('id', session.id)

            const q0 = questions[0]
            const options = Array.isArray(q0.options)
              ? q0.options
              : typeof q0.options === 'string'
              ? JSON.parse(q0.options)
              : []
            const defaultTimer =
              (session.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds || 20
            const timerSec = q0.timer_seconds || defaultTimer

            // Broadcast to room channel
            const channel = supabase.channel(`room:${session.room_code.toUpperCase().trim()}`)
            await channel.send({
              type: 'broadcast',
              event: 'question_started',
              payload: {
                questionId: q0.id,
                questionIndex: 0,
                questionText: q0.text,
                options,
                timerSeconds: timerSec,
                startedAt,
              },
            })
            await supabase.removeChannel(channel)
            autoStartedCount++
          }
        }
      }

      // 1.2 Send reminders for sessions starting in the next 24 hours
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      const { data: upcomingSessions } = await supabase
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

      let remindersSent = 0
      const remindedInviteIds: string[] = []

      if (upcomingSessions && emailJsServiceId && emailJsTemplateId && emailJsPublicKey) {
        for (const sess of upcomingSessions) {
          const invites = (sess.invites as Array<{ id: string; email: string; status: string }>) || []
          const quiz = sess.quizzes as { title?: string } | null
          const joinUrl = `${siteUrl}/room/${sess.room_code}`

          for (const invite of invites) {
            if (invite.status === 'sent') {
              try {
                const emailPayload: Record<string, unknown> = {
                  service_id: emailJsServiceId,
                  template_id: emailJsTemplateId,
                  user_id: emailJsPublicKey,
                  template_params: {
                    to_email: invite.email,
                    email: invite.email,
                    to_name: invite.email.split('@')[0],
                    quiz_title: quiz?.title || 'Live Quiz',
                    scheduled_at: sess.scheduled_at,
                    timezone: sess.timezone || 'UTC',
                    join_url: joinUrl,
                    subject: `Reminder: "${quiz?.title || 'Live Quiz'}" is starting soon on Huddle!`,
                  },
                }
                if (emailJsPrivateKey) {
                  emailPayload.accessToken = emailJsPrivateKey
                }

                const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(emailPayload),
                })

                if (emailRes.status === 200) {
                  remindersSent++
                  remindedInviteIds.push(invite.id)
                }
              } catch (e) {
                console.error('[Supabase Edge Schedule] Email dispatch error:', e)
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
      }

      return new Response(
        JSON.stringify({
          success: true,
          platform: 'supabase-edge-runtime',
          autoStartedSessions: autoStartedCount,
          remindersSent,
          timestamp: now.toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // ============================================================
    // 2. POST: Create scheduled session & dispatch invites
    // ============================================================
    if (req.method === 'POST') {
      const body = await req.json()
      const { quizId, scheduledAt, timezone = 'UTC', emails = [] } = body

      if (!quizId || !scheduledAt) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: quizId and scheduledAt' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, owner_id')
        .eq('id', quizId)
        .single()

      if (quizError || !quiz) {
        return new Response(
          JSON.stringify({ error: 'Quiz not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Generate room code (6 alphanumeric characters)
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
      let roomCode = ''
      for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }

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
        return new Response(
          JSON.stringify({ error: sessionError?.message || 'Failed to create session' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      const joinUrl = `${siteUrl}/room/${session.room_code}`
      const uniqueEmails = Array.from(
        new Set(
          (emails as string[])
            .map((e) => e.trim().toLowerCase())
            .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        )
      )

      if (uniqueEmails.length > 0) {
        const invites = uniqueEmails.map((email) => ({
          session_id: session.id,
          email,
          status: 'sent',
        }))
        await supabase.from('invites').insert(invites)

        // Dispatch EmailJS invitations
        if (emailJsServiceId && emailJsTemplateId && emailJsPublicKey) {
          for (const recipient of uniqueEmails) {
            try {
              const emailPayload: Record<string, unknown> = {
                service_id: emailJsServiceId,
                template_id: emailJsTemplateId,
                user_id: emailJsPublicKey,
                template_params: {
                  to_email: recipient,
                  email: recipient,
                  to_name: recipient.split('@')[0],
                  quiz_title: quiz.title,
                  host_name: 'Huddle Host',
                  scheduled_at: scheduledAt,
                  timezone,
                  join_url: joinUrl,
                  subject: `Invitation: ${quiz.title} on Huddle`,
                },
              }
              if (emailJsPrivateKey) {
                emailPayload.accessToken = emailJsPrivateKey
              }

              await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailPayload),
              })
            } catch (err) {
              console.error('[Supabase Edge Schedule] Email delivery warning:', err)
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          sessionId: session.id,
          roomCode: session.room_code,
          joinUrl,
          invitedCount: uniqueEmails.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Edge Function Error'
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
