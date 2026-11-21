import { getQuizzes } from './quizzes/actions'
import { getUpcomingSessions, getPastSessions } from './sessions/actions'
import { QuizCard } from '@/components/dashboard/quiz-card'
import { CreateQuizDialog } from '@/components/dashboard/create-quiz-dialog'
import { PastSessionsView } from '@/components/dashboard/past-sessions-view'
import { ScheduledSessionsView } from '@/components/dashboard/scheduled-sessions-view'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Calendar, Layers, Clock, ArrowRight, Play, History, Users } from 'lucide-react'
import Link from 'next/link'

interface DashboardPageProps {
  searchParams?: Promise<{ tab?: string; quizId?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const activeTab = resolvedSearchParams?.tab || 'quizzes'
  const filterQuizId = resolvedSearchParams?.quizId

  const [quizzes, upcomingSessions, pastSessions] = await Promise.all([
    getQuizzes(),
    getUpcomingSessions(),
    getPastSessions(),
  ])

  return (
    <div className="space-y-7">
      {/* Top Welcome / Action Banner (Workspace Card) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-7 border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Host Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Quizzes &amp; Live Sessions</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Create AI quizzes, host live multiplayer rooms with real-time scoring, or schedule calendar-backed sessions.
          </p>
        </div>
        <CreateQuizDialog />
      </div>

      <Tabs key={activeTab} defaultValue={activeTab} className="space-y-6">
        <TabsList className="h-11 rounded-xl p-1 bg-muted/60 border border-border/50">
          <TabsTrigger value="quizzes" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
            <Layers className="h-4 w-4" /> My Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
            <Calendar className="h-4 w-4" /> Scheduled ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2 rounded-lg text-xs font-semibold px-3 py-1.5">
            <History className="h-4 w-4" /> Past Sessions ({pastSessions.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. MY QUIZZES */}
        <TabsContent value="quizzes" className="space-y-4">
          {quizzes.length === 0 ? (
            <Card className="rounded-2xl border-dashed py-14 text-center">
              <CardContent className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">No quizzes created yet</CardTitle>
                <CardDescription className="max-w-sm mx-auto text-sm">
                  Create your first quiz in seconds with AI by uploading notes, typing a topic, or building it manually.
                </CardDescription>
                <div className="pt-2">
                  <CreateQuizDialog />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. UPCOMING SESSIONS */}
        <TabsContent value="upcoming" className="space-y-4">
          <ScheduledSessionsView sessions={upcomingSessions} />
        </TabsContent>

        {/* 3. PAST SESSIONS */}
        <TabsContent value="past" className="space-y-4">
          <PastSessionsView sessions={pastSessions} initialQuizId={filterQuizId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
