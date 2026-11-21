'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Calendar, Clock, Play, Copy, Check, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { deleteScheduledSession } from '@/app/dashboard/sessions/actions'
import { cn } from '@/lib/utils'

export interface ScheduledSessionItem {
  id: string
  room_code: string
  status: string
  scheduled_at: string | null
  timezone: string
  quizzes?: { id?: string; title?: string } | { id?: string; title?: string }[] | null
}

interface ScheduledSessionsViewProps {
  sessions: ScheduledSessionItem[]
}

export function ScheduledSessionsView({ sessions }: ScheduledSessionsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<ScheduledSessionItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCopyLink = (session: ScheduledSessionItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const joinUrl = `${origin}/room/${session.room_code}`

    let timeText = ''
    if (session.scheduled_at) {
      try {
        const d = new Date(session.scheduled_at)
        timeText = ` (Scheduled: ${d.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: session.timezone || 'UTC',
        })} ${session.timezone || 'UTC'})`
      } catch {}
    }

    navigator.clipboard.writeText(joinUrl)
    setCopiedId(session.id)
    toast.success(`Join link for Room ${session.room_code} copied!${timeText ? ' ' + timeText : ''}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async () => {
    if (!sessionToDelete) return
    try {
      setDeleting(true)
      await deleteScheduledSession(sessionToDelete.id)
      toast.success(`Scheduled session (Room ${sessionToDelete.room_code}) deleted`)
      setSessionToDelete(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete scheduled session'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const formatScheduledTime = (scheduledAt: string | null, tz: string) => {
    if (!scheduledAt) return { dateStr: 'Immediate Session', timeStr: '', relative: '' }
    try {
      const date = new Date(scheduledAt)
      const dateStr = date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: tz || 'UTC',
      })
      const timeStr = date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: tz || 'UTC',
      })

      // Calculate relative info
      const diffMs = date.getTime() - Date.now()
      const diffHours = Math.round(diffMs / (1000 * 60 * 60))
      let relative = ''
      if (diffMs < 0) {
        relative = 'Past scheduled time'
      } else if (diffHours <= 1) {
        relative = 'Starting soon'
      } else if (diffHours < 24) {
        relative = `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`
      } else {
        const days = Math.round(diffHours / 24)
        relative = `In ${days} day${days > 1 ? 's' : ''}`
      }

      return { dateStr, timeStr, relative }
    } catch {
      return { dateStr: scheduledAt, timeStr: '', relative: '' }
    }
  }

  if (sessions.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed py-14 text-center">
        <CardContent className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Calendar className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-bold">No scheduled sessions</CardTitle>
          <CardDescription className="max-w-sm mx-auto text-sm">
            Schedule a future quiz session from your Quizzes tab to invite participants and generate calendar links.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => {
          const quizTitle = Array.isArray(session.quizzes)
            ? session.quizzes[0]?.title
            : session.quizzes?.title

          const { dateStr, timeStr, relative } = formatScheduledTime(
            session.scheduled_at,
            session.timezone
          )

          const isCopied = copiedId === session.id

          return (
            <Card
              key={session.id}
              className="flex flex-col justify-between rounded-2xl border border-border/80 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[11px] rounded-full px-2.5 py-0.5 font-bold tracking-wider">
                        ROOM: {session.room_code}
                      </Badge>
                      <Badge className="capitalize text-[11px] rounded-full px-2 py-0.5">
                        {session.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-1">
                      {quizTitle || 'Scheduled Quiz'}
                    </CardTitle>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSessionToDelete(session)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete scheduled session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-4 px-5">
                {/* Prominent Scheduled Date & Time Pill */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{dateStr}</span>
                    </div>
                    {relative && (
                      <span className="text-[11px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {relative}
                      </span>
                    )}
                  </div>

                  {timeStr && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary/70" />
                      <span>
                        {timeStr} <span className="text-[11px] opacity-80">({session.timezone})</span>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="border-t p-4 px-5 flex flex-wrap items-center gap-2 bg-muted/10 rounded-b-2xl">
                <Link
                  href={`/host/room/${session.room_code}`}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'flex-1 min-w-[120px] gap-1.5 rounded-xl font-bold text-xs'
                  )}
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Open Host Room
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(session)}
                  className="rounded-xl text-xs gap-1.5 font-medium"
                  title="Copy direct join link"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>

                <Link
                  href={`/room/${session.room_code}`}
                  target="_blank"
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground' })}
                  title="Open player link in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Confirmation Dialog for Deleting Scheduled Session */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel and delete this scheduled session for{' '}
              <strong className="text-foreground font-semibold">
                &ldquo;
                {sessionToDelete
                  ? Array.isArray(sessionToDelete.quizzes)
                    ? sessionToDelete.quizzes[0]?.title
                    : sessionToDelete.quizzes?.title || 'Quiz'
                  : ''}
                &rdquo;
              </strong>{' '}
              (Room Code:{' '}
              <span className="font-mono font-bold text-foreground">
                {sessionToDelete?.room_code}
              </span>
              )? This action cannot be undone and invitees will no longer be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {deleting ? 'Deleting...' : 'Delete Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
