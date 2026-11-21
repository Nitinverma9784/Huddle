'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Download,
  ArrowLeft,
  Users,
  Target,
  Clock,
  AlertCircle,
  Crown,
  Medal,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export interface QuestionStat {
  id: string
  text: string
  order: number
  totalResponses: number
  correctCount: number
  accuracy: number
  avgTimeSeconds: string
}

export interface PlayerRecord {
  id: string
  display_name: string
  avatar: string
  score: number
}

export interface AnalyticsData {
  session: {
    room_code: string
    created_at: string
    updated_at: string
  }
  quizTitle: string
  players: PlayerRecord[]
  overallAccuracy: number
  avgResponseTimeSeconds: string
  totalPlayers: number
  perQuestionStats: QuestionStat[]
  mostMissed: QuestionStat[]
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const {
    session,
    quizTitle,
    players,
    overallAccuracy,
    avgResponseTimeSeconds,
    totalPlayers,
    perQuestionStats,
    mostMissed,
  } = data

  const handleExportCsv = () => {
    try {
      const headers = ['Rank', 'Player Name', 'Score', 'Avatar ID']
      const rows = players.map((p, idx) => [
        idx + 1,
        `"${p.display_name.replace(/"/g, '""')}"`,
        p.score,
        p.avatar,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `huddle-results-${session.room_code}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Results exported to CSV!')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'gap-1 text-xs -ml-2 mb-1',
            })}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Session Report: {quizTitle}
          </h1>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            Room Code: <span className="font-mono font-bold text-foreground">{session.room_code}</span> &bull;{' '}
            {new Date(session.updated_at || session.created_at).toLocaleDateString(undefined, {
              dateStyle: 'full',
            })}
          </p>
        </div>

        <Button onClick={handleExportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export Results to CSV
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Players
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{totalPlayers}</div>
            <p className="text-[11px] text-muted-foreground">Participants connected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Overall Accuracy
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{overallAccuracy}%</div>
            <p className="text-[11px] text-muted-foreground">Average question success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{avgResponseTimeSeconds}s</div>
            <p className="text-[11px] text-muted-foreground">Per answered question</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Missed Questions Warning Box */}
      {mostMissed.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-base font-bold">Most-Missed Questions</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Questions where players struggled the most:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mostMissed.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card border text-xs"
              >
                <div className="space-y-0.5 max-w-xl">
                  <span className="font-bold">Q{q.order}: </span>
                  <span>{q.text}</span>
                </div>
                <Badge variant="destructive" className="font-mono text-xs">
                  {q.accuracy}% Correct
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-Question Accuracy Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Question Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Performance and response metrics for each individual question.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="text-center">Responses</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perQuestionStats.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-bold text-xs">{q.order}</TableCell>
                  <TableCell className="font-medium text-xs max-w-md truncate">
                    {q.text}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono">
                    {q.totalResponses}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={q.accuracy >= 70 ? 'default' : q.accuracy >= 40 ? 'secondary' : 'destructive'}
                      className="font-mono text-xs"
                    >
                      {q.accuracy}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {q.avgTimeSeconds}s
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Final Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Final Standings</CardTitle>
          <CardDescription className="text-xs">
            Scores and rankings of all participants in this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p, idx) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-1.5">
                      {idx === 0 && <Crown className="h-4 w-4 text-amber-500" />}
                      {idx === 1 && <Medal className="h-4 w-4 text-slate-400" />}
                      {idx === 2 && <Medal className="h-4 w-4 text-amber-700" />}
                      <span>#{idx + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatar}`} />
                        <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-xs">{p.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm text-primary">
                    {p.score.toLocaleString()} pts
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
