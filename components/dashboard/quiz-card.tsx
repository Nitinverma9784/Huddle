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
} from 'lucide-react'
import { duplicateQuiz, deleteQuiz } from '@/app/dashboard/quizzes/actions'
import { createLiveSession } from '@/app/dashboard/sessions/actions'
import { toast } from 'sonner'
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

  const formattedDate = new Date(quiz.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {quiz.source_type === 'prompt' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> AI Prompt
                  </Badge>
                )}
                {quiz.source_type === 'file' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" /> Document
                  </Badge>
                )}
                {quiz.source_type === 'manual' && (
                  <Badge variant="outline" className="text-xs">
                    Manual
                  </Badge>
                )}
              </div>
              <CardTitle className="line-clamp-1 text-lg font-bold">{quiz.title}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'h-8 w-8 text-muted-foreground'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

        <CardContent className="pb-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              <span>{quiz.question_count} questions</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{quiz.default_timer_seconds}s per Q</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Edited {formattedDate}</div>
        </CardContent>

        <CardFooter className="pt-0 flex gap-2">
          <Button
            className="flex-1 gap-2"
            size="sm"
            onClick={handleStartLive}
            disabled={loading}
          >
            <Play className="h-4 w-4 fill-current" /> Start Live Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            className="gap-1.5"
          >
            <Calendar className="h-4 w-4" /> Schedule
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
