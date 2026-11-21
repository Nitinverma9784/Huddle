import { notFound } from 'next/navigation'
import { getQuizWithQuestions } from './actions'
import { QuizEditor } from '@/components/quiz-editor/quiz-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuizEditorPage({ params }: PageProps) {
  const { id } = await params

  let quizData
  try {
    quizData = await getQuizWithQuestions(id)
  } catch {
    notFound()
  }

  return <QuizEditor initialQuiz={quizData.quiz} initialQuestions={quizData.questions} />
}
