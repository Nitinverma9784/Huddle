'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional().default(''),
  source_type: z.enum(['manual', 'prompt', 'file']).default('manual'),
  theme: z.string().default('default'),
  default_timer_seconds: z.number().int().min(5).max(120).default(20),
  default_points: z.number().int().min(100).max(2000).default(1000),
})

export async function getQuizzes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      description,
      source_type,
      theme,
      cover_image_url,
      default_timer_seconds,
      default_points,
      created_at,
      updated_at,
      questions ( id )
    `)
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching quizzes:', error)
    return []
  }

  return (quizzes || []).map((q) => ({
    ...q,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
  }))
}

export async function createQuiz(input: z.infer<typeof CreateQuizSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const validated = CreateQuizSchema.parse(input)

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title: validated.title,
      description: validated.description,
      source_type: validated.source_type,
      theme: validated.theme,
      default_timer_seconds: validated.default_timer_seconds,
      default_points: validated.default_points,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create quiz')
  }

  revalidatePath('/dashboard')
  return data
}

export async function duplicateQuiz(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // 1. Fetch original quiz
  const { data: original, error: fetchError } = await supabase
    .from('quizzes')
    .select('*, questions(*)')
    .eq('id', quizId)
    .eq('owner_id', user.id)
    .single()

  if (fetchError || !original) {
    throw new Error('Quiz not found')
  }

  // 2. Insert duplicated quiz
  const { data: newQuiz, error: insertError } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title: `${original.title} (Copy)`,
      description: original.description,
      source_type: original.source_type,
      theme: original.theme,
      cover_image_url: original.cover_image_url,
      default_timer_seconds: original.default_timer_seconds,
      default_points: original.default_points,
    })
    .select('id')
    .single()

  if (insertError || !newQuiz) {
    throw new Error('Failed to duplicate quiz')
  }

  // 3. Duplicate questions if any
  if (original.questions && original.questions.length > 0) {
    const questionsToInsert = original.questions.map((q: {
      text: string
      options: string[] | string
      correct_index: number
      timer_seconds: number
      points: number
      image_url?: string
      order_index: number
    }) => ({
      quiz_id: newQuiz.id,
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      timer_seconds: q.timer_seconds,
      points: q.points,
      image_url: q.image_url,
      order_index: q.order_index,
    }))

    await supabase.from('questions').insert(questionsToInsert)
  }

  revalidatePath('/dashboard')
  return newQuiz
}

export async function deleteQuiz(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)
    .eq('owner_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  return { success: true }
}
