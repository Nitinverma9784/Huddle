'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSessionAnalytics(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Fetch session & quiz
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      id,
      room_code,
      status,
      created_at,
      updated_at,
      quizzes (
        id,
        title,
        questions (
          id,
          text,
          options,
          correct_index,
          points,
          order_index
        )
      )
    `)
    .eq('id', sessionId)
    .eq('host_id', user.id)
    .single()

  if (sessionError || !session) throw new Error('Session not found')

  // Fetch players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false })

  // Fetch answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId)

  interface QuestionData {
    id: string
    text: string
    options: string[] | string
    correct_index: number
    points: number
    order_index: number
  }

  const quiz = session.quizzes as {
    title?: string
    questions?: QuestionData[]
  } | null

  const questions: QuestionData[] = (quiz?.questions || []).sort(
    (a, b) => a.order_index - b.order_index
  )

  // Compute analytics
  const allAnswers = answers || []
  const allPlayers = players || []

  // Enrich each player with individual correct and wrong question counts and accuracy
  const enrichedPlayers = allPlayers.map((p) => {
    const pAnswers = allAnswers.filter((a) => a.player_id === p.id)
    const pCorrect = pAnswers.filter((a) => a.is_correct).length
    const pIncorrect = pAnswers.filter((a) => !a.is_correct).length
    const pTotal = pAnswers.length
    const pAccuracy = pTotal > 0 ? Math.round((pCorrect / pTotal) * 100) : 0

    return {
      ...p,
      correctCount: pCorrect,
      incorrectCount: pIncorrect,
      totalAnswered: pTotal,
      accuracy: pAccuracy,
    }
  })

  const totalResponses = allAnswers.length
  const correctCount = allAnswers.filter((a) => a.is_correct).length
  const overallAccuracy = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
  const avgResponseTimeMs =
    totalResponses > 0
      ? Math.round(allAnswers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0) / totalResponses)
      : 0

  const perQuestionStats = questions.map((q) => {
    const qAnswers = allAnswers.filter((a) => a.question_id === q.id)
    const qTotal = qAnswers.length
    const qCorrect = qAnswers.filter((a) => a.is_correct).length
    const qAccuracy = qTotal > 0 ? Math.round((qCorrect / qTotal) * 100) : 0
    const qAvgTime =
      qTotal > 0
        ? Math.round(qAnswers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0) / qTotal)
        : 0

    return {
      id: q.id,
      text: q.text,
      order: q.order_index + 1,
      totalResponses: qTotal,
      correctCount: qCorrect,
      accuracy: qAccuracy,
      avgTimeSeconds: (qAvgTime / 1000).toFixed(1),
    }
  })

  // Most missed questions (accuracy < 50% or lowest accuracy)
  const mostMissed = [...perQuestionStats]
    .filter((q) => q.totalResponses > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  return {
    session,
    quizTitle: quiz?.title || 'Quiz',
    players: enrichedPlayers,
    overallAccuracy,
    avgResponseTimeSeconds: (avgResponseTimeMs / 1000).toFixed(1),
    totalPlayers: allPlayers.length,
    perQuestionStats,
    mostMissed,
  }
}
