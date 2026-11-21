'use server'

import { createClient } from '@/lib/supabase/server'
import { generateRoomCode } from '@/lib/room-code'
import { sendEmailViaSendgrid } from '@/lib/email/sendgrid'
import { renderInviteHtml, renderInviteText } from '@/lib/email/templates'
import { generateIcsCalendar } from '@/lib/email/ics'
import { revalidatePath } from 'next/cache'

interface ScheduleSessionInput {
  quizId: string
  scheduledAt: string
  timezone: string
  emails: string[]
}

export async function scheduleSessionWithInvites(input: ScheduleSessionInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Fetch quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title')
    .eq('id', input.quizId)
    .eq('owner_id', user.id)
    .single()

  if (quizError || !quiz) throw new Error('Quiz not found')

  const roomCode = generateRoomCode()
  const hostName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Host'

  // Insert session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      quiz_id: quiz.id,
      host_id: user.id,
      room_code: roomCode,
      status: 'scheduled',
      scheduled_at: input.scheduledAt,
      timezone: input.timezone,
    })
    .select('id, room_code')
    .single()

  if (sessionError || !session) throw new Error('Failed to create scheduled session')

  // Clean emails
  const uniqueEmails = Array.from(
    new Set(
      input.emails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    )
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const joinUrl = `${siteUrl}/room/${session.room_code}`

  // Create invites rows in Supabase
  if (uniqueEmails.length > 0) {
    const invitesData = uniqueEmails.map((email) => ({
      session_id: session.id,
      email,
      status: 'sent',
    }))
    await supabase.from('invites').insert(invitesData)

    // Dispatch email invitations with ICS calendar attachment via SendGrid API
    try {
      const icsContent = await generateIcsCalendar({
        title: quiz.title,
        description: `Live multiplayer quiz hosted on Huddle.`,
        startIso: input.scheduledAt,
        url: joinUrl,
        organizerName: hostName,
      })

      const icsBase64 = Buffer.from(icsContent).toString('base64')

      for (const email of uniqueEmails) {
        await sendEmailViaSendgrid({
          to: email,
          subject: `Invitation: ${quiz.title} on Huddle`,
          html: renderInviteHtml({
            quizTitle: quiz.title,
            hostName,
            scheduledAt: input.scheduledAt,
            timezone: input.timezone,
            joinUrl,
          }),
          text: renderInviteText({
            quizTitle: quiz.title,
            hostName,
            scheduledAt: input.scheduledAt,
            timezone: input.timezone,
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
    } catch (err) {
      console.warn('[Schedule Action] SendGrid email delivery warning (non-fatal):', err)
    }
  }

  revalidatePath('/dashboard')
  return {
    sessionId: session.id,
    roomCode: session.room_code,
    joinUrl,
    invitedCount: uniqueEmails.length,
  }
}
