import { getQuizzes } from './quizzes/actions'
import { getUpcomingSessions, getPastSessions } from './sessions/actions'
import { QuizCard } from '@/components/dashboard/quiz-card'
import { CreateQuizDialog } from '@/components/dashboard/create-quiz-dialog'
import { PastSessionsView } from '@/components/dashboard/past-sessions-view'
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
          {upcomingSessions.length === 0 ? (
            <Card className="rounded-2xl border-dashed py-14 text-center">
              <CardContent className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-bold">No scheduled sessions</CardTitle>
                <CardDescription className="max-w-sm mx-auto text-sm">
                  Schedule a future quiz session to send automated email invitations with calendar attachments.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSessions.map((session: {
                id: string
                room_code: string
                status: string
                scheduled_at: string | null
                timezone: string
                quizzes?: { title?: string } | { title?: string }[] | null
              }) => {
                const quizTitle = Array.isArray(session.quizzes)
                  ? session.quizzes[0]?.title
                  : session.quizzes?.title
                return (
                  <Card key={session.id} className="flex flex-col justify-between rounded-2xl border border-border/80 hover:border-primary/50 hover:shadow-md transition-all">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1 font-mono text-[11px] rounded-full px-2.5 py-0.5">
                            ROOM: {session.room_code}
                          </Badge>
                          <CardTitle className="text-base font-bold">
                            {quizTitle || 'Scheduled Quiz'}
                          </CardTitle>
                        </div>
                        <Badge className="capitalize text-xs rounded-full px-2.5 py-0.5">{session.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground pb-4 px-5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/40 font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span suppressHydrationWarning>
                          {session.scheduled_at
                            ? new Date(session.scheduled_at).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: session.timezone,
                              })
                            : 'Immediate Session'}
                        </span>
                      </div>
                    </CardContent>
                    <div className="border-t p-4 px-5 flex gap-2">
                      <Link
                        href={`/host/room/${session.room_code}`}
                        className={buttonVariants({ size: 'sm', className: 'flex-1 gap-1.5 rounded-xl font-bold text-xs' })}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Open Host Room
                      </Link>
                      <Link
                        href={`/room/${session.room_code}`}
                        target="_blank"
                        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-xl text-xs' })}
                      >
                        Player Link
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 3. PAST SESSIONS */}
        <TabsContent value="past" className="space-y-4">
          <PastSessionsView sessions={pastSessions} initialQuizId={filterQuizId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
