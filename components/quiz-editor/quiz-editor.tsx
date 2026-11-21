'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GripVertical,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Circle,
  Save,
  ArrowLeft,
  Clock,
  Award,
  Loader2,
} from 'lucide-react'
import { saveQuizWithQuestions, regenerateQuestionAction } from '@/app/dashboard/quizzes/[id]/actions'
import { toast } from 'sonner'
import Link from 'next/link'

export interface EditorQuestion {
  id: string
  text: string
  options: string[]
  correct_index: number
  timer_seconds: number
  points: number
  image_url: string
  order_index: number
}

interface QuizEditorProps {
  initialQuiz: {
    id: string
    title: string
    description?: string
    theme: string
    cover_image_url?: string
    default_timer_seconds: number
    default_points: number
  }
  initialQuestions: EditorQuestion[]
}

// Sortable Item Component
function SortableQuestionCard({
  question,
  index,
  total,
  onUpdate,
  onDelete,
  onRegenerate,
}: {
  question: EditorQuestion
  index: number
  total: number
  onUpdate: (updated: EditorQuestion) => void
  onDelete: (id: string) => void
  onRegenerate: (question: EditorQuestion) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleTextChange = (text: string) => {
    onUpdate({ ...question, text })
  }

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...question.options]
    next[idx] = val
    onUpdate({ ...question, options: next })
  }

  const handleAddOption = () => {
    if (question.options.length < 6) {
      onUpdate({
        ...question,
        options: [...question.options, `Option ${question.options.length + 1}`],
      })
    }
  }

  const handleRemoveOption = (idx: number) => {
    if (question.options.length <= 2) {
      toast.error('A question must have at least 2 options')
      return
    }
    const next = question.options.filter((_, i) => i !== idx)
    let nextCorrect = question.correct_index
    if (nextCorrect === idx) {
      nextCorrect = 0
    } else if (nextCorrect > idx) {
      nextCorrect--
    }
    onUpdate({ ...question, options: next, correct_index: nextCorrect })
  }

  const handleSetCorrect = (idx: number) => {
    onUpdate({ ...question, correct_index: idx })
  }

  return (
    <Card ref={setNodeRef} style={style} className="border shadow-sm">
      <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="font-semibold text-xs">
            Question {index + 1} of {total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRegenerate(question)}
            className="h-8 gap-1 text-xs text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Rewrite
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(question.id)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Question Text</Label>
          <Input
            value={question.text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type your question prompt here..."
            className="font-medium text-sm"
          />
        </div>

        {/* Options Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Answer Options (Click circle to set correct answer)</Label>
            {question.options.length < 6 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddOption}
                className="h-6 text-xs text-primary gap-1"
              >
                <Plus className="h-3 w-3" /> Add Option
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question.options.map((option, idx) => {
              const isCorrect = question.correct_index === idx
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    isCorrect
                      ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20 shadow-sm'
                      : 'border-border bg-card'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSetCorrect(idx)}
                    className="shrink-0 p-1 rounded-full hover:bg-muted"
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 fill-green-100 dark:fill-green-950" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="h-8 text-xs border-0 focus-visible:ring-0 shadow-none px-1"
                  />
                  {question.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(idx)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Per-question Timer, Points & Image */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Timer (Seconds)
            </Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={question.timer_seconds}
              onChange={(e) =>
                onUpdate({ ...question, timer_seconds: parseInt(e.target.value, 10) || 20 })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Award className="h-3 w-3" /> Points
            </Label>
            <Input
              type="number"
              min={100}
              max={2000}
              step={100}
              value={question.points}
              onChange={(e) =>
                onUpdate({ ...question, points: parseInt(e.target.value, 10) || 1000 })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Image URL (Optional)</Label>
            <Input
              value={question.image_url || ''}
              onChange={(e) => onUpdate({ ...question, image_url: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuizEditor({ initialQuiz, initialQuestions }: QuizEditorProps) {
  const router = useRouter()
  const [quiz, setQuiz] = useState(initialQuiz)
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    initialQuestions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx}`,
    }))
  )
  const [saving, setSaving] = useState(false)

  // AI Rewrite Dialog State
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [activeRewriteQuestion, setActiveRewriteQuestion] = useState<EditorQuestion | null>(null)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [rewriting, setRewriting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleAddQuestion = () => {
    const newQ: EditorQuestion = {
      id: `new-${Date.now()}`,
      text: '',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correct_index: 0,
      timer_seconds: quiz.default_timer_seconds || 20,
      points: quiz.default_points || 1000,
      image_url: '',
      order_index: questions.length,
    }
    setQuestions([...questions, newQ])
  }

  const handleUpdateQuestion = (updated: EditorQuestion) => {
    setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)))
  }

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const handleOpenRewrite = (q: EditorQuestion) => {
    setActiveRewriteQuestion(q)
    setRewriteInstruction('')
    setRewriteOpen(true)
  }

  const handleExecuteRewrite = async () => {
    if (!activeRewriteQuestion) return
    try {
      setRewriting(true)
      const res = await regenerateQuestionAction(
        {
          text: activeRewriteQuestion.text,
          options: activeRewriteQuestion.options,
          correct_index: activeRewriteQuestion.correct_index,
          timer_seconds: activeRewriteQuestion.timer_seconds,
          points: activeRewriteQuestion.points,
          image_url: activeRewriteQuestion.image_url,
          order_index: activeRewriteQuestion.order_index,
        },
        rewriteInstruction
      )

      handleUpdateQuestion({
        ...activeRewriteQuestion,
        text: res.text,
        options: res.options,
        correct_index: res.correct_index,
      })

      toast.success('Question refreshed!')
      setRewriteOpen(false)
    } catch {
      toast.error('Failed to regenerate question')
    } finally {
      setRewriting(false)
    }
  }

  const handleSave = async () => {
    if (!quiz.title.trim()) {
      toast.error('Quiz title cannot be empty')
      return
    }

    try {
      setSaving(true)
      await saveQuizWithQuestions(
        quiz.id,
        {
          title: quiz.title,
          description: quiz.description,
          theme: quiz.theme,
          cover_image_url: quiz.cover_image_url,
          default_timer_seconds: quiz.default_timer_seconds,
          default_points: quiz.default_points,
        },
        questions.map((q, idx) => ({
          text: q.text,
          options: q.options,
          correct_index: q.correct_index,
          timer_seconds: q.timer_seconds,
          points: q.points,
          image_url: q.image_url,
          order_index: idx,
        }))
      )
      toast.success('Quiz saved successfully!')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save quiz'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Top Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1 text-xs' })}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Quiz-Wide Settings Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Quiz Title</Label>
              <Input
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                placeholder="Title..."
                className="font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Theme</Label>
              <Select
                value={quiz.theme}
                onValueChange={(val) => {
                  if (val) setQuiz({ ...quiz, theme: val })
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Violet</SelectItem>
                  <SelectItem value="ocean">Ocean Blue</SelectItem>
                  <SelectItem value="sunset">Sunset Orange</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk Neon</SelectItem>
                  <SelectItem value="forest">Forest Emerald</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description (Optional)</Label>
            <Textarea
              value={quiz.description || ''}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              placeholder="Instructions or topic summary..."
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Timer (Seconds)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={quiz.default_timer_seconds}
                onChange={(e) =>
                  setQuiz({
                    ...quiz,
                    default_timer_seconds: parseInt(e.target.value, 10) || 20,
                  })
                }
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Base Points</Label>
              <Input
                type="number"
                min={100}
                max={2000}
                step={100}
                value={quiz.default_points}
                onChange={(e) =>
                  setQuiz({
                    ...quiz,
                    default_points: parseInt(e.target.value, 10) || 1000,
                  })
                }
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-lg font-bold">Questions ({questions.length})</h2>
          <p className="text-xs text-muted-foreground">
            Drag the handle to reorder questions.
          </p>
        </div>
        <Button onClick={handleAddQuestion} size="sm" variant="outline" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Question
        </Button>
      </div>

      {/* Drag & Drop Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <SortableQuestionCard
                key={q.id}
                question={q}
                index={idx}
                total={questions.length}
                onUpdate={handleUpdateQuestion}
                onDelete={handleDeleteQuestion}
                onRegenerate={handleOpenRewrite}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {questions.length === 0 && (
        <Card className="border-dashed py-8 text-center">
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">No questions in this quiz yet.</p>
            <Button onClick={handleAddQuestion} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Your First Question
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Rewrite Dialog */}
      <Dialog open={rewriteOpen} onOpenChange={setRewriteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Regenerate Question with AI
            </DialogTitle>
            <DialogDescription>
              Provide optional instructions to guide the AI rewrite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Instruction (Optional)</Label>
              <Input
                placeholder="e.g. Make it harder, create trickier options, rephrase..."
                value={rewriteInstruction}
                onChange={(e) => setRewriteInstruction(e.target.value)}
              />
            </div>
            <div className="rounded border bg-muted/30 p-2.5 text-xs">
              <span className="font-semibold">Current: </span>
              {activeRewriteQuestion?.text || '(Empty text)'}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRewriteOpen(false)} disabled={rewriting}>
              Cancel
            </Button>
            <Button onClick={handleExecuteRewrite} disabled={rewriting} className="gap-2">
              {rewriting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Rewriting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Rewrite Question
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
