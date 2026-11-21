'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Play,
  Calendar,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  Clock,
  Layers,
  Sparkles,
  FileText,
  BarChart2,
} from 'lucide-react'
import { duplicateQuiz, deleteQuiz } from '@/app/dashboard/quizzes/actions'
import { createLiveSession } from '@/app/dashboard/sessions/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ScheduleDialog } from './schedule-dialog'
import { cn } from '@/lib/utils'

export interface QuizCardData {
  id: string
  title: string
  description?: string
  source_type: string
  question_count: number
  theme: string
  updated_at: string
  default_timer_seconds: number
}

export function QuizCard({ quiz }: { quiz: QuizCardData }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleStartLive = async () => {
    try {
      setLoading(true)
      const session = await createLiveSession(quiz.id)
      toast.success(`Live room created: ${session.room_code}`)
      router.push(`/host/room/${session.room_code}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session'
      toast.error(msg)
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      setLoading(true)
      await duplicateQuiz(quiz.id)
      toast.success('Quiz duplicated successfully')
      router.refresh()
    } catch {
      toast.error('Failed to duplicate quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      await deleteQuiz(quiz.id)
      toast.success('Quiz deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete quiz')
    } finally {
      setLoading(false)
      setDeleteOpen(false)
    }
  }

  const formattedDate = quiz.updated_at
    ? format(new Date(quiz.updated_at), 'MMM d, yyyy')
    : ''

  return (
    <>
      <Card className="flex flex-col justify-between rounded-2xl sm:rounded-[22px] border border-border/70 bg-card hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {quiz.source_type === 'prompt' && (
                  <Badge variant="secondary" className="gap-1 text-[11px] rounded-full px-2.5 py-0.5 font-semibold">
                    <Sparkles className="h-3 w-3 text-primary" /> AI Generated
                  </Badge>
                )}
                {quiz.source_type === 'file' && (
                  <Badge variant="secondary" className="gap-1 text-[11px] rounded-full px-2.5 py-0.5 font-semibold">
                    <FileText className="h-3 w-3 text-primary" /> Document
                  </Badge>
                )}
                {quiz.source_type === 'manual' && (
                  <Badge variant="outline" className="text-[11px] rounded-full px-2.5 py-0.5 font-semibold">
                    Manual
                  </Badge>
                )}
              </div>
              <CardTitle className="line-clamp-1 text-base sm:text-lg font-bold group-hover:text-primary transition-colors">
                {quiz.title}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'h-8 w-8 text-muted-foreground rounded-lg hover:bg-muted'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/quizzes/${quiz.id}`)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Quiz
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} disabled={loading} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScheduleOpen(true)} className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" /> Schedule Session
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard?tab=past&quizId=${quiz.id}`)}
                  className="cursor-pointer"
                >
                  <BarChart2 className="mr-2 h-4 w-4" /> Past Results
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-4 px-5">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 font-medium">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{quiz.question_count} questions</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{quiz.default_timer_seconds}s</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground/80 font-medium" suppressHydrationWarning>
            Updated {formattedDate}
          </div>
        </CardContent>

        <CardFooter className="pt-0 px-5 pb-5 flex gap-2">
          <Button
            className="flex-1 gap-2 rounded-xl font-bold shadow-xs py-4 text-xs"
            size="sm"
            onClick={handleStartLive}
            disabled={loading}
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Start Live
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            className="gap-1.5 rounded-xl font-medium text-xs px-3"
          >
            <Calendar className="h-3.5 w-3.5" /> Schedule
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{quiz.title}&rdquo;? This action cannot be undone and all associated questions will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Dialog */}
      <ScheduleDialog
        quizId={quiz.id}
        quizTitle={quiz.title}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
    </>
  )
}
