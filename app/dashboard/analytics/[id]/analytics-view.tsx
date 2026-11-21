'use client'

import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Search,
  Activity,
  Laptop,
  Camera,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getAvatarUrl } from '@/lib/avatar'

export interface QuestionStat {
  id: string
  text: string
  order: number
  totalResponses: number
  correctCount: number
  accuracy: number
  avgTimeSeconds: string
}

export interface IntegrityAlertRecord {
  id: string
  playerId: string
  playerName: string
  action: string
  timestamp: string
  timestampMs?: number
  questionIndex?: number
}

export interface PlayerRecord {
  id: string
  display_name: string
  avatar: string
  score: number
  correctCount?: number
  incorrectCount?: number
  totalAnswered?: number
  accuracy?: number
  tabSwitches?: number
  screenshots?: number
  totalAlerts?: number
  alertsList?: IntegrityAlertRecord[]
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
  totalTabSwitches?: number
  totalScreenshots?: number
  totalAlertsCount?: number
  integrityAlerts?: IntegrityAlertRecord[]
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
    totalTabSwitches = 0,
    totalScreenshots = 0,
    totalAlertsCount = 0,
    integrityAlerts = [],
    perQuestionStats,
    mostMissed,
  } = data

  const [activeActivityTab, setActiveActivityTab] = useState<'all' | 'tab' | 'screenshot' | 'devtools'>('all')
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')

  const screenshotAlertsCount = integrityAlerts.filter((a) => {
    const act = (a.action || '').toLowerCase()
    return (
      act.includes('screenshot') ||
      act.includes('snapshot') ||
      act.includes('print') ||
      act.includes('copy') ||
      act.includes('cut')
    )
  }).length

  const devtoolsAlertsCount = integrityAlerts.filter((a) => {
    const act = (a.action || '').toLowerCase()
    return (
      act.includes('devtools') ||
      act.includes('inspect') ||
      act.includes('context menu') ||
      act.includes('right click')
    )
  }).length

  const handleExportCsv = () => {
    try {
      const headers = [
        'Rank',
        'Player Name',
        'Score',
        'Correct Questions',
        'Wrong Questions',
        'Accuracy %',
        'Tab Switches',
        'Screenshots / Copy',
        'Total Suspicious Flags',
        'Avatar ID',
      ]
      const rows = players.map((p, idx) => [
        idx + 1,
        `"${p.display_name.replace(/"/g, '""')}"`,
        p.score,
        p.correctCount ?? 0,
        p.incorrectCount ?? 0,
        `${p.accuracy ?? 0}%`,
        p.tabSwitches ?? 0,
        p.screenshots ?? 0,
        p.totalAlerts ?? 0,
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

  // Filtered integrity alerts for the interactive audit log
  const filteredAlerts = integrityAlerts.filter((alert) => {
    // Filter by type
    const actionLower = alert.action.toLowerCase()
    if (activeActivityTab === 'tab') {
      if (
        !actionLower.includes('tab') &&
        !actionLower.includes('blur') &&
        !actionLower.includes('window') &&
        !actionLower.includes('minimized')
      ) {
        return false
      }
    } else if (activeActivityTab === 'screenshot') {
      if (
        !actionLower.includes('screenshot') &&
        !actionLower.includes('snapshot') &&
        !actionLower.includes('copy') &&
        !actionLower.includes('print') &&
        !actionLower.includes('cut')
      ) {
        return false
      }
    } else if (activeActivityTab === 'devtools') {
      if (
        !actionLower.includes('devtools') &&
        !actionLower.includes('inspect') &&
        !actionLower.includes('context menu') &&
        !actionLower.includes('right click')
      ) {
        return false
      }
    }

    // Filter by player search query
    if (playerSearchQuery.trim()) {
      return alert.playerName.toLowerCase().includes(playerSearchQuery.toLowerCase().trim())
    }

    return true
  })

  const cleanPlayerCount = players.filter(
    (p) => (p.tabSwitches ?? 0) === 0 && (p.screenshots ?? 0) === 0 && (p.totalAlerts ?? 0) === 0
  ).length

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

      {/* KPI Metric Cards (4-grid including Integrity & Focus Audit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border/80 shadow-xs">
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

        <Card className="rounded-2xl border border-border/80 shadow-xs">
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

        <Card className="rounded-2xl border border-border/80 shadow-xs">
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

        <Card className="rounded-2xl border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Focus &amp; Integrity
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black flex items-center gap-2 flex-wrap">
              <span>{totalTabSwitches}</span>
              <span className="text-xs font-medium text-muted-foreground">switches</span>
              {totalScreenshots > 0 && (
                <Badge variant="destructive" className="text-[10px] font-mono px-1.5 py-0 gap-1">
                  <Camera className="h-2.5 w-2.5" /> {totalScreenshots} {totalScreenshots === 1 ? 'screenshot' : 'screenshots'}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {cleanPlayerCount} of {players.length} players stayed 100% focused
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Most Missed Questions Warning Box */}
      {mostMissed.length > 0 && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-xs overflow-hidden">
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
                className="flex items-center justify-between p-3 rounded-xl bg-card border text-xs"
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
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-lg font-bold">Question Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Performance and response metrics for each individual question.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="text-center">Responses</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-right pr-4">Avg Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perQuestionStats.map((q) => (
                <TableRow key={q.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-xs pl-4">{q.order}</TableCell>
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
                  <TableCell className="text-right text-xs font-mono pr-4">
                    {q.avgTimeSeconds}s
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Final Leaderboard / Participants Performance */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Participant Performance</CardTitle>
              <CardDescription className="text-xs">
                Scores, correct &amp; wrong answers, and individual tab switch flags for each player.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {players.length} players
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 pl-4">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Correct</TableHead>
                <TableHead className="text-center">Wrong</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">Focus / Activity</TableHead>
                <TableHead className="text-right pr-4">Total Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p, idx) => (
                <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-xs pl-4">
                    <div className="flex items-center gap-1.5">
                      {idx === 0 && <Crown className="h-4 w-4 text-amber-500" />}
                      {idx === 1 && <Medal className="h-4 w-4 text-slate-400" />}
                      {idx === 2 && <Medal className="h-4 w-4 text-amber-700" />}
                      <span>#{idx + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border">
                        <AvatarImage src={getAvatarUrl(p.avatar)} />
                        <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-xs">{p.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs font-bold gap-1 px-2 py-0.5"
                    >
                      <Check className="h-3 w-3" /> {p.correctCount ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 font-mono text-xs font-bold gap-1 px-2 py-0.5"
                    >
                      <X className="h-3 w-3" /> {p.incorrectCount ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={(p.accuracy ?? 0) >= 70 ? 'default' : (p.accuracy ?? 0) >= 40 ? 'secondary' : 'destructive'}
                      className="font-mono text-xs px-2 py-0.5"
                    >
                      {p.accuracy ?? 0}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {(p.screenshots ?? 0) > 0 && (
                        <Badge
                          variant="destructive"
                          className="font-mono text-xs font-bold gap-1 px-2 py-0.5"
                          title={`${p.screenshots} screenshot/copy attempt(s)`}
                        >
                          <Camera className="h-3 w-3" /> {p.screenshots} {p.screenshots === 1 ? 'screenshot' : 'screenshots'}
                        </Badge>
                      )}
                      {(p.tabSwitches ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-mono text-xs font-bold gap-1 px-2 py-0.5"
                          title={`${p.tabSwitches} tab switch / window blur event(s) recorded`}
                        >
                          <AlertTriangle className="h-3 w-3" /> {p.tabSwitches} {p.tabSwitches === 1 ? 'switch' : 'switches'}
                        </Badge>
                      )}
                      {(p.totalAlerts ?? 0) > 0 && (p.screenshots ?? 0) === 0 && (p.tabSwitches ?? 0) === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-mono text-xs font-bold gap-1 px-2 py-0.5"
                          title={`${p.totalAlerts} suspicious activity flag(s)`}
                        >
                          <ShieldAlert className="h-3 w-3" /> {p.totalAlerts} flagged
                        </Badge>
                      )}
                      {(p.tabSwitches ?? 0) === 0 && (p.screenshots ?? 0) === 0 && (p.totalAlerts ?? 0) === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs font-bold gap-1 px-2 py-0.5"
                        >
                          <ShieldCheck className="h-3 w-3" /> Clean
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm text-primary pr-4">
                    {p.score.toLocaleString()} pts
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Interactive Player Activity & Integrity Audit Feed */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg font-bold">Interactive Activity &amp; Tab-Switch Audit</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Real-time tab switching, app unfocusing, and activity logs captured during live gameplay.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {integrityAlerts.length} total events
            </Badge>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              <Button
                variant={activeActivityTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveActivityTab('all')}
                className="text-xs h-7 px-3 rounded-full"
              >
                All Activity ({integrityAlerts.length})
              </Button>
              <Button
                variant={activeActivityTab === 'tab' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveActivityTab('tab')}
                className="text-xs h-7 px-3 rounded-full gap-1"
              >
                <Laptop className="h-3 w-3" /> Tab Switches ({totalTabSwitches})
              </Button>
              <Button
                variant={activeActivityTab === 'screenshot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveActivityTab('screenshot')}
                className="text-xs h-7 px-3 rounded-full gap-1"
              >
                <Camera className="h-3 w-3" /> Screenshots / Copy ({screenshotAlertsCount})
              </Button>
              <Button
                variant={activeActivityTab === 'devtools' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveActivityTab('devtools')}
                className="text-xs h-7 px-3 rounded-full gap-1"
              >
                <ShieldAlert className="h-3 w-3" /> Inspect / DevTools ({devtoolsAlertsCount})
              </Button>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter by player..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
              <div className="font-bold text-sm">No suspicious activity detected</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {integrityAlerts.length === 0
                  ? 'All participants stayed focused on the quiz without leaving their browser tab!'
                  : 'No activities match the current filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredAlerts.map((alert) => {
                const actLower = alert.action.toLowerCase()
                const isTabSwitch =
                  actLower.includes('tab') ||
                  actLower.includes('window') ||
                  actLower.includes('blur') ||
                  actLower.includes('minimized')

                const isScreenshot =
                  actLower.includes('screenshot') ||
                  actLower.includes('snapshot') ||
                  actLower.includes('print') ||
                  actLower.includes('copy') ||
                  actLower.includes('cut')

                const isDevTools =
                  actLower.includes('devtools') ||
                  actLower.includes('inspect') ||
                  actLower.includes('context menu') ||
                  actLower.includes('right click')

                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground font-bold shrink-0">
                        {isScreenshot ? (
                          <Camera className="h-3.5 w-3.5 text-rose-500" />
                        ) : isTabSwitch ? (
                          <Laptop className="h-3.5 w-3.5 text-amber-500" />
                        ) : isDevTools ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{alert.playerName}</span>
                          {alert.questionIndex !== undefined && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                              Question {alert.questionIndex + 1}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span
                            className={
                              isScreenshot
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : isTabSwitch
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : isDevTools
                                ? 'text-purple-600 dark:text-purple-400 font-medium'
                                : 'text-orange-600 dark:text-orange-400 font-medium'
                            }
                          >
                            {alert.action}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {alert.timestamp}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
