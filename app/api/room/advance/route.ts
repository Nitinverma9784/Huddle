import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { room_code, current_index } = await req.json()
    if (!room_code) {
      return NextResponse.json({ error: 'Missing room_code' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, quiz_id, status, current_question_index, question_started_at, scheduled_at, quizzes(default_timer_seconds)')
      .eq('room_code', room_code.toUpperCase().trim())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // 2. Fetch quiz questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, options, correct_index, timer_seconds, points, order_index')
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for quiz' }, { status: 400 })
    }

    // Handle scheduled quiz auto-start (or initiating Question 0)
    if (session.status === 'scheduled' || (session.status === 'lobby' && current_index === -1)) {
      const scheduledTime = session.scheduled_at ? new Date(session.scheduled_at).getTime() : 0
      // If scheduled, ensure scheduled_at time has arrived (with 5-second leeway buffer)
      if (session.status === 'scheduled' && session.scheduled_at && Date.now() < scheduledTime - 5000) {
        return NextResponse.json({
          success: false,
          message: 'Scheduled start time has not been reached yet.',
          scheduled_at: session.scheduled_at,
        })
      }

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
      const q0Options = Array.isArray(q0.options)
        ? q0.options
        : typeof q0.options === 'string'
        ? JSON.parse(q0.options)
        : []

      const channel = supabase.channel(`room:${room_code.toUpperCase().trim()}`)
      const quizDefaultTimer = (session.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds
      const timerSec = q0.timer_seconds || quizDefaultTimer || 20

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

      return NextResponse.json({
        success: true,
        nextIndex: 0,
        isEnd: false,
        status: 'live',
      })
    }

    // Guard: Only advance if the session is live, question_ended, or in leaderboard review
    if (session.status !== 'live' && session.status !== 'question_ended' && session.status !== 'leaderboard') {
      return NextResponse.json({ success: true, status: session.status })
    }

    // Idempotency: If the session has already advanced beyond the requested index, return latest
    if (current_index !== undefined && current_index >= 0 && session.current_question_index > current_index) {
      return NextResponse.json({
        success: true,
        already_advanced: true,
        current_index: session.current_question_index,
      })
    }

    const nextIndex = session.current_question_index + 1
    const startedAt = new Date().toISOString()

    if (nextIndex < questions.length) {
      // Advance to next question
      await supabase
        .from('sessions')
        .update({
          current_question_index: nextIndex,
          question_started_at: startedAt,
          status: 'live',
          updated_at: startedAt,
        })
        .eq('id', session.id)

      const nextQ = questions[nextIndex]
      const nextOptions = Array.isArray(nextQ.options)
        ? nextQ.options
        : typeof nextQ.options === 'string'
        ? JSON.parse(nextQ.options)
        : []

      // Broadcast question_started to the room channel
      const channel = supabase.channel(`room:${room_code.toUpperCase().trim()}`)
      const quizDefaultTimer = (session.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds
      const timerSec = nextQ.timer_seconds || quizDefaultTimer || 20

      await channel.send({
        type: 'broadcast',
        event: 'question_started',
        payload: {
          questionId: nextQ.id,
          questionIndex: nextIndex,
          questionText: nextQ.text,
          options: nextOptions,
          timerSeconds: timerSec,
          startedAt,
        },
      })
      await supabase.removeChannel(channel)

      return NextResponse.json({
        success: true,
        nextIndex,
        isEnd: false,
      })
    } else {
      // Last question completed -> End game
      await supabase
        .from('sessions')
        .update({
          status: 'ended',
          updated_at: startedAt,
        })
        .eq('id', session.id)

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id)
        .order('score', { ascending: false })

      const channel = supabase.channel(`room:${room_code.toUpperCase().trim()}`)
      await channel.send({
        type: 'broadcast',
        event: 'game_ended',
        payload: {
          podium: (players || []).slice(0, 3),
          fullLeaderboard: players || [],
        },
      })
      await supabase.removeChannel(channel)

      return NextResponse.json({
        success: true,
        isEnd: true,
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to advance session'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
