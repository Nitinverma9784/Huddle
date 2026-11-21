import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromBuffer } from '@/lib/file-parser'
import { generateQuizWithFallback } from '@/lib/ai/fallback'
import { AIGenerateRequestSchema, Difficulty, QuestionType } from '@/lib/validations/quiz'

const MAX_GENERATIONS_PER_DAY = 20
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Check Rate Limit (20 generations per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', oneDayAgo)

    if (countError) {
      console.warn('Error checking rate limit:', countError)
    } else if (count !== null && count >= MAX_GENERATIONS_PER_DAY) {
      return NextResponse.json(
        {
          error: `Daily AI generation limit reached (${MAX_GENERATIONS_PER_DAY}/day). Please try again tomorrow or create quizzes manually.`,
        },
        { status: 429 }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    let topic = ''
    let questionCount = 5
    let difficulty: Difficulty = 'medium'
    let questionType: QuestionType = 'mcq'
    let sourceText = ''
    let sourceType: 'prompt' | 'file' = 'prompt'
    let fileWarning: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      topic = (formData.get('topic') as string) || (file ? file.name.replace(/\.[^/.]+$/, '') : 'Quiz')
      questionCount = Number(formData.get('question_count')) || 5
      difficulty = (formData.get('difficulty') as Difficulty) || 'medium'
      questionType = (formData.get('question_type') as QuestionType) || 'mcq'
      sourceType = 'file'

      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const parsedDoc = await extractTextFromBuffer(buffer, file.type, file.name)
        sourceText = parsedDoc.text
        fileWarning = parsedDoc.warning

        if (sourceText.length < 20) {
          return NextResponse.json(
            { error: 'Extracted document text is too short to generate questions.' },
            { status: 400 }
          )
        }
      }
    } else {
      const body = await req.json()
      const validated = AIGenerateRequestSchema.parse(body)
      topic = validated.topic
      questionCount = validated.question_count
      difficulty = validated.difficulty
      questionType = validated.question_type
    }

    // 2. Generate with Fallback Chain
    const { provider, result } = await generateQuizWithFallback({
      topic,
      question_count: questionCount,
      difficulty,
      question_type: questionType,
      sourceText,
    })

    // 3. Log AI usage
    await supabase.from('ai_usage').insert({
      owner_id: user.id,
      provider,
      tokens: result.questions.length * 50,
    })

    // 4. Create Draft Quiz in Postgres
    const quizTitle = result.title || `${topic} Quiz`
    const { data: newQuiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        owner_id: user.id,
        title: quizTitle,
        description: `Generated via AI (${difficulty} difficulty, ${questionType})`,
        source_type: sourceType,
        default_timer_seconds: 20,
        default_points: 1000,
      })
      .select('id')
      .single()

    if (quizError || !newQuiz) {
      return NextResponse.json(
        { error: quizError?.message || 'Failed to save generated quiz' },
        { status: 500 }
      )
    }

    // 5. Insert questions
    const questionsToInsert = result.questions.map((q, idx) => ({
      quiz_id: newQuiz.id,
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      timer_seconds: 20,
      points: 1000,
      order_index: idx,
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      console.error('Failed to insert generated questions:', questionsError)
    }

    return NextResponse.json({
      success: true,
      quizId: newQuiz.id,
      provider,
      warning: fileWarning,
      questionCount: questionsToInsert.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown generation error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
