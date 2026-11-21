import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlayerJoinSchema } from '@/lib/validations/quiz'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { room_code, display_name, avatar } = PlayerJoinSchema.parse(body)
    const existingToken = body.token as string | undefined

    const supabase = createAdminClient()

    // 1. Fetch Session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, current_question_index, question_started_at, scheduled_at, settings, quiz_id, quizzes(default_timer_seconds)')
      .eq('room_code', room_code.toUpperCase().trim())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Room not found. Check the code.' }, { status: 404 })
    }

    if (session.status === 'ended' || session.status === 'cancelled') {
      return NextResponse.json({ error: 'This game session has already ended.' }, { status: 400 })
    }

    // Helper to fetch current question & leaderboard for late-joining players
    const fetchGameContext = async () => {
      let currentQuestion = null
      let leaderboard = null

      if (session.quiz_id) {
        const { data: questions } = await supabase
          .from('questions')
          .select('id, text, options, timer_seconds, order_index')
          .eq('quiz_id', session.quiz_id)
          .order('order_index', { ascending: true })

        const q = questions?.[session.current_question_index]
        if (q) {
          currentQuestion = {
            id: q.id,
            text: q.text,
            options: Array.isArray(q.options)
              ? q.options
              : typeof q.options === 'string'
              ? JSON.parse(q.options)
              : [],
            timer_seconds:
              q.timer_seconds ||
              (session.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds ||
              20,
          }
        }
      }

      if (['leaderboard', 'ended'].includes(session.status)) {
        const { data: topPlayers } = await supabase
          .from('players')
          .select('id, display_name, avatar, score')
          .eq('session_id', session.id)
          .order('score', { ascending: false })
          .limit(5)
        leaderboard = topPlayers || []
      }

      return { currentQuestion, leaderboard }
    }

    // 2. Reconnect Handling
    if (existingToken) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id)
        .eq('token', existingToken)
        .single()

      if (existingPlayer) {
        if (existingPlayer.kicked) {
          return NextResponse.json({ error: 'You have been kicked from this room.' }, { status: 403 })
        }
        const { currentQuestion, leaderboard } = await fetchGameContext()
        return NextResponse.json({
          player: existingPlayer,
          session,
          current_question: currentQuestion,
          leaderboard,
          reconnected: true,
        })
      }
    }

    // 3. Create New Player
    const token = crypto.randomBytes(16).toString('hex')
    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        session_id: session.id,
        display_name: display_name.trim(),
        avatar: avatar || '1',
        token,
        score: 0,
      })
      .select('*')
      .single()

    if (playerError || !newPlayer) {
      return NextResponse.json({ error: 'Failed to join game session.' }, { status: 500 })
    }

    const { currentQuestion, leaderboard } = await fetchGameContext()

    return NextResponse.json({
      player: newPlayer,
      session,
      current_question: currentQuestion,
      leaderboard,
      reconnected: false,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
