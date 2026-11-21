import { getQuizzes } from './quizzes/actions'
import { getUpcomingSessions, getPastSessions } from './sessions/actions'
import { QuizCard } from '@/components/dashboard/quiz-card'
import { CreateQuizDialog } from '@/components/dashboard/create-quiz-dialog'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Calendar, Layers, Clock, ArrowRight, Play, History, Users } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const [quizzes, upcomingSessions, pastSessions] = await Promise.all([
    getQuizzes(),
    getUpcomingSessions(),
    getPastSessions(),
  ])

  return (
    <div className="space-y-8">
      {/* Top Welcome / Action Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Host Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your quizzes, launch real-time multiplayer rooms, or schedule automated invite sessions.
          </p>
        </div>
        <CreateQuizDialog />
      </div>

      <Tabs defaultValue="quizzes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quizzes" className="gap-2">
            <Layers className="h-4 w-4" /> My Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" /> Scheduled ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <History className="h-4 w-4" /> Past Sessions ({pastSessions.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. MY QUIZZES */}
        <TabsContent value="quizzes" className="space-y-4">
          {quizzes.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
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
            <Card className="border-dashed py-12 text-center">
              <CardContent className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">No scheduled sessions</CardTitle>
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
                  <Card key={session.id} className="flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1 font-mono text-xs">
                            ROOM: {session.room_code}
                          </Badge>
                          <CardTitle className="text-base font-bold">
                            {quizTitle || 'Scheduled Quiz'}
                          </CardTitle>
                        </div>
                        <Badge className="capitalize">{session.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground pb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
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
                    <div className="border-t p-4 flex gap-2">
                      <Link
                        href={`/host/room/${session.room_code}`}
                        className={buttonVariants({ size: 'sm', className: 'flex-1 gap-1.5' })}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Open Host Room
                      </Link>
                      <Link
                        href={`/room/${session.room_code}`}
                        target="_blank"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
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
          {pastSessions.length === 0 ? (
            <Card className="border-dashed py-12 text-center">
              <CardContent className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <History className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">No past sessions recorded</CardTitle>
                <CardDescription className="max-w-sm mx-auto text-sm">
                  Completed game sessions, podium leaderboards, and question accuracy analytics will appear here.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((session: {
                id: string
                room_code: string
                player_count: number
                updated_at: string
                created_at: string
                quizzes?: { title?: string } | { title?: string }[] | null
              }) => {
                const quizTitle = Array.isArray(session.quizzes)
                  ? session.quizzes[0]?.title
                  : session.quizzes?.title
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        {quizTitle || 'Quiz Session'}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Room: {session.room_code}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {session.player_count} players
                        </span>
                        <span>&bull;</span>
                        <span suppressHydrationWarning>
                          {new Date(session.updated_at || session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/analytics/${session.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                    >
                      View Results <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
