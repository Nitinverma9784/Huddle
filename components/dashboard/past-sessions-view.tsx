'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import {
  History,
  Users,
  Trophy,
  ArrowRight,
  Search,
  Filter,
  Calendar,
  Layers,
} from 'lucide-react'

export interface PastSessionData {
  id: string
  room_code: string
  status: string
  created_at: string
  updated_at: string
  quiz_id: string
  quizzes?: { id?: string; title?: string } | { id?: string; title?: string }[] | null
  player_count: number
  top_scorer?: { name: string; score: number } | null
}

interface PastSessionsViewProps {
  sessions: PastSessionData[]
  initialQuizId?: string
}

export function PastSessionsView({ sessions, initialQuizId }: PastSessionsViewProps) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Extract unique quizzes from sessions
  const uniqueQuizzes = useMemo(() => {
    const map = new Map<string, string>()
    sessions.forEach((s) => {
      const q = Array.isArray(s.quizzes) ? s.quizzes[0] : s.quizzes
      if (s.quiz_id && q?.title) {
        map.set(s.quiz_id, q.title)
      }
    })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  }, [sessions])

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const q = Array.isArray(s.quizzes) ? s.quizzes[0] : s.quizzes
        const title = (q?.title || '').toLowerCase()
        const code = (s.room_code || '').toLowerCase()
        const query = searchQuery.trim().toLowerCase()

        // Quiz filter
        if (selectedQuizId !== 'all' && s.quiz_id !== selectedQuizId) {
          return false
        }

        // Search query
        if (query && !title.includes(query) && !code.includes(query)) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime()
        const timeB = new Date(b.updated_at || b.created_at).getTime()
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
      })
  }, [sessions, selectedQuizId, searchQuery, sortOrder])

  if (sessions.length === 0) {
    return (
      <Card className="border-dashed py-12 text-center">
        <CardContent className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <History className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">No past sessions recorded</CardTitle>
          <CardDescription className="max-w-sm mx-auto text-sm">
            Completed live quiz sessions, player scores, accuracy analytics, and rankings will appear here automatically.
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by quiz name or room code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Quiz Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
            <Select value={selectedQuizId} onValueChange={(val) => setSelectedQuizId(val || 'all')}>
              <SelectTrigger className="w-[180px] sm:w-[200px] bg-background text-xs font-medium">
                <SelectValue placeholder="All Quizzes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quizzes ({sessions.length})</SelectItem>
                {uniqueQuizzes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={(v) => { if (v) setSortOrder(v as 'newest' | 'oldest') }}>
            <SelectTrigger className="w-[140px] bg-background text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter status indicator if active filter */}
      {selectedQuizId !== 'all' && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing results for:{' '}
            <strong className="text-foreground">
              {uniqueQuizzes.find((q) => q.id === selectedQuizId)?.title}
            </strong>{' '}
            ({filteredSessions.length} found)
          </span>
          <button
            onClick={() => setSelectedQuizId('all')}
            className="text-primary hover:underline font-semibold"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Sessions Grid / List */}
      {filteredSessions.length === 0 ? (
        <div className="p-8 text-center border rounded-2xl bg-card space-y-2">
          <p className="text-sm font-semibold">No sessions match your search or filter</p>
          <p className="text-xs text-muted-foreground">
            Try choosing &ldquo;All Quizzes&rdquo; or clearing your search term.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const q = Array.isArray(session.quizzes) ? session.quizzes[0] : session.quizzes
            const quizTitle = q?.title || 'Live Quiz Session'
            const sessionDate = session.updated_at || session.created_at
            const formattedDate = sessionDate
              ? format(new Date(sessionDate), 'MMM d, yyyy • h:mm a')
              : 'Unknown date'

            return (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-all gap-4 shadow-xs hover:shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-foreground truncate">
                      {quizTitle}
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px] font-bold rounded-full px-2.5 py-0.5">
                      ROOM: {session.room_code}
                    </Badge>
                    <Badge
                      variant={session.status === 'ended' ? 'secondary' : 'default'}
                      className="text-[10px] capitalize rounded-full px-2.5 py-0.5"
                    >
                      {session.status === 'ended' ? 'Completed' : session.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span suppressHydrationWarning>{formattedDate}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {session.player_count} {session.player_count === 1 ? 'player' : 'players'}
                    </span>
                    {session.top_scorer && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                          <Trophy className="h-3.5 w-3.5" /> Winner: {session.top_scorer.name} (
                          {session.top_scorer.score} pts)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/analytics/${session.id}`}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className: 'gap-1.5 font-bold text-xs rounded-xl shadow-xs hover:border-primary/50',
                    })}
                  >
                    View Results & Analytics <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
