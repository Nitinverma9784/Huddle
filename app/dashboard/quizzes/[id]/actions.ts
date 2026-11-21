'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Question } from '@/lib/validations/quiz'
import { regenerateQuestionWithFallback } from '@/lib/ai/fallback'

export async function getQuizWithQuestions(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .eq('owner_id', user.id)
    .single()

  if (quizError || !quiz) throw new Error('Quiz not found')

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true })

  if (questionsError) throw new Error('Failed to load questions')

  return {
    quiz,
    questions: (questions || []).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
    })),
  }
}

export async function saveQuizWithQuestions(
  quizId: string,
  quizUpdates: {
    title: string
    description?: string
    theme: string
    cover_image_url?: string
    default_timer_seconds: number
    default_points: number
  },
  questions: Array<{
    id?: string
    text: string
    options: string[]
    correct_index: number
    timer_seconds: number
    points: number
    image_url?: string
    order_index: number
  }>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // 1. Update Quiz table
  const { error: updateError } = await supabase
    .from('quizzes')
    .update({
      title: quizUpdates.title,
      description: quizUpdates.description,
      theme: quizUpdates.theme,
      cover_image_url: quizUpdates.cover_image_url,
      default_timer_seconds: quizUpdates.default_timer_seconds,
      default_points: quizUpdates.default_points,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quizId)
    .eq('owner_id', user.id)

  if (updateError) throw new Error(updateError.message)

  // 2. Delete existing questions for this quiz and re-insert in current order
  await supabase.from('questions').delete().eq('quiz_id', quizId)

  if (questions.length > 0) {
    const formattedQuestions = questions.map((q, index) => ({
      quiz_id: quizId,
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      timer_seconds: q.timer_seconds || quizUpdates.default_timer_seconds || 20,
      points: q.points || quizUpdates.default_points || 1000,
      image_url: q.image_url || '',
      order_index: index,
    }))

    const { error: insertError } = await supabase
      .from('questions')
      .insert(formattedQuestions)

    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath(`/dashboard/quizzes/${quizId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function regenerateQuestionAction(
  question: Question,
  instruction?: string
) {
  return await regenerateQuestionWithFallback(question, instruction)
}
