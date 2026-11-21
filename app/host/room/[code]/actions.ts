'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getHostRoomData(roomCode: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Fetch session & quiz
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      quizzes (
        id,
        title,
        description,
        theme,
        cover_image_url,
        default_timer_seconds,
        default_points,
        questions (
          id,
          text,
          options,
          correct_index,
          timer_seconds,
          points,
          image_url,
          order_index
        )
      )
    `)
    .eq('room_code', roomCode.toUpperCase().trim())
    .eq('host_id', user.id)
    .single()

  if (sessionError || !session) {
    throw new Error('Host session not found')
  }

  // Fetch joined players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', session.id)
    .order('score', { ascending: false })

  interface HostQuestionItem {
    id: string
    text: string
    options: string[] | string
    correct_index: number
    timer_seconds: number
    points: number
    image_url?: string
    order_index: number
  }

  const quiz = session.quizzes as {
    id: string
    title: string
    description?: string
    theme: string
    cover_image_url?: string
    default_timer_seconds: number
    default_points: number
    questions?: HostQuestionItem[]
  } | null

  const questions = (quiz?.questions || [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => ({
      ...q,
      timer_seconds: q.timer_seconds || quiz?.default_timer_seconds || 20,
      points: q.points || quiz?.default_points || 1000,
    }))

  return {
    session,
    quiz,
    questions,
    players: players || [],
  }
}

export async function startCountdownAction(sessionId: string, seconds = 5) {
  const admin = createAdminClient()
  const countdownUntil = new Date(Date.now() + seconds * 1000).toISOString()

  const { data, error } = await admin
    .from('sessions')
    .update({
      settings: {
        countdown_until: countdownUntil,
        countdown_seconds: seconds,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.warn('startCountdownAction error:', error.message)
  }
  return { countdownUntil, session: data }
}

export async function startRoomAction(sessionId: string) {
  const admin = createAdminClient()
  const startedAt = new Date().toISOString()

  const { data, error } = await admin
    .from('sessions')
    .update({
      status: 'live',
      current_question_index: 0,
      question_started_at: startedAt,
      settings: {},
      updated_at: startedAt,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function nextQuestionAction(sessionId: string, nextIndex: number) {
  const admin = createAdminClient()
  const startedAt = new Date().toISOString()

  const { data, error } = await admin
    .from('sessions')
    .update({
      status: 'live',
      current_question_index: nextIndex,
      question_started_at: startedAt,
      updated_at: startedAt,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function endQuestionAction(sessionId: string) {
  const admin = createAdminClient()

  // Try updating to question_ended. If constraint fails on legacy database, fallback to live with question_started_at null
  const { data, error } = await admin
    .from('sessions')
    .update({
      status: 'question_ended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    const fallback = await admin
      .from('sessions')
      .update({
        status: 'live',
        question_started_at: null,
        settings: { stage: 'question_ended' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (fallback.error) throw new Error(fallback.error.message)
    return { ...fallback.data, status: 'question_ended' }
  }
  return data
}

export async function showLeaderboardAction(sessionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sessions')
    .update({
      status: 'leaderboard',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    const fallback = await admin
      .from('sessions')
      .update({
        status: 'live',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (fallback.error) throw new Error(fallback.error.message)
    return fallback.data
  }
  return data
}

export async function endGameAction(sessionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sessions')
    .update({
      status: 'ended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function kickPlayerAction(sessionId: string, playerId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('players')
    .update({ kicked: true })
    .eq('id', playerId)
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getSessionAnswers(sessionId: string, questionId: string) {
  const admin = createAdminClient()
  const { data: answers } = await admin
    .from('answers')
    .select('selected_index, is_correct, player_id')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)

  return answers || []
}
