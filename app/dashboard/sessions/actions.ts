'use server'

import { createClient } from '@/lib/supabase/server'
import { generateRoomCode } from '@/lib/room-code'

export async function createLiveSession(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Ensure quiz exists and belongs to host
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title')
    .eq('id', quizId)
    .eq('owner_id', user.id)
    .single()

  if (quizError || !quiz) {
    throw new Error('Quiz not found')
  }

  // Generate unique room code
  let roomCode = generateRoomCode()
  for (let attempts = 0; attempts < 5; attempts++) {
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('room_code', roomCode)
      .single()

    if (!existing) {
      break
    }
    roomCode = generateRoomCode()
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      quiz_id: quiz.id,
      host_id: user.id,
      room_code: roomCode,
      status: 'lobby',
      current_question_index: 0,
      settings: {
        theme: 'default',
        sound: true,
      },
    })
    .select('id, room_code')
    .single()

  if (sessionError || !session) {
    throw new Error(sessionError?.message || 'Failed to create live session')
  }

  return session
}

export async function getUpcomingSessions() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      room_code,
      status,
      scheduled_at,
      timezone,
      created_at,
      quizzes (
        id,
        title,
        cover_image_url
      )
    `)
    .eq('host_id', user.id)
    .in('status', ['scheduled', 'lobby', 'live'])
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching upcoming sessions:', error)
    return []
  }

  return data || []
}

export async function getPastSessions() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      room_code,
      status,
      created_at,
      updated_at,
      quizzes (
        id,
        title
      ),
      players (
        id,
        score
      )
    `)
    .eq('host_id', user.id)
    .eq('status', 'ended')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching past sessions:', error)
    return []
  }

  return (data || []).map((s) => ({
    ...s,
    player_count: Array.isArray(s.players) ? s.players.length : 0,
  }))
}
