import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateScore } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { player_id, player_token, selected_index } = body
    let { session_id, question_id } = body

    if (!player_id || !player_token || selected_index === undefined) {
      return NextResponse.json({ error: 'Missing required player credentials' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Verify Player & Token
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, session_id, kicked, score')
      .eq('id', player_id)
      .eq('token', player_token)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Invalid player session' }, { status: 401 })
    }

    if (player.kicked) {
      return NextResponse.json({ error: 'You have been removed from this game' }, { status: 403 })
    }

    // Resolve session_id from player record if not provided
    session_id = session_id || player.session_id

    // 2. Fetch Session to check server-authoritative time
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, quiz_id, status, current_question_index, question_started_at')
      .eq('id', session_id)
      .single()

    if (sessionError || !session || session.status !== 'live') {
      return NextResponse.json({ error: 'Question is not currently active' }, { status: 400 })
    }

    // 3. Resolve Question details
    let question = null
    if (question_id) {
      const { data: q } = await supabase
        .from('questions')
        .select('id, correct_index, timer_seconds, points')
        .eq('id', question_id)
        .single()
      question = q
    }

    if (!question) {
      // Lookup current question by order_index
      const { data: questions } = await supabase
        .from('questions')
        .select('id, correct_index, timer_seconds, points')
        .eq('quiz_id', session.quiz_id)
        .order('order_index', { ascending: true })

      if (questions && questions[session.current_question_index]) {
        question = questions[session.current_question_index]
        question_id = question.id
      }
    }

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // 4. Calculate Server-Authoritative Response Time
    const serverNow = Date.now()
    const startedAt = session.question_started_at
      ? new Date(session.question_started_at).getTime()
      : serverNow
    const responseTimeMs = Math.max(0, serverNow - startedAt)

    // Check if submitted within timer + 2 second network grace period
    const allowedTimeMs = (question.timer_seconds + 2) * 1000
    if (responseTimeMs > allowedTimeMs) {
      return NextResponse.json(
        { error: 'Time expired for this question', expired: true },
        { status: 400 }
      )
    }

    const isCorrect = selected_index === question.correct_index
    const scoreResult = calculateScore({
      isCorrect,
      basePoints: question.points,
      timerSeconds: question.timer_seconds,
      responseTimeMs,
    })

    // 5. Store answer in Postgres (idempotent / unique constraint)
    const { error: answerError } = await supabase.from('answers').insert({
      session_id,
      player_id,
      question_id,
      selected_index,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      points_awarded: scoreResult.pointsAwarded,
    })

    if (answerError) {
      // Already answered
      return NextResponse.json({ error: 'Answer already submitted' }, { status: 409 })
    }

    // 6. Update Player's Total Score
    const newScore = player.score + scoreResult.pointsAwarded
    await supabase.from('players').update({ score: newScore }).eq('id', player_id)

    return NextResponse.json({
      success: true,
      is_correct: isCorrect,
      points_awarded: scoreResult.pointsAwarded,
      speed_bonus: scoreResult.speedBonus,
      new_score: newScore,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid answer submission'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
