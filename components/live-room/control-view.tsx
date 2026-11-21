'use client'


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/avatar'
import {
  Play,
  SkipForward,
  StopCircle,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trophy,
  Camera,
  Layers,
  Copy,
  MousePointer,
  Terminal,
  Minimize2,
  Sparkles,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import { PresenterPlayer, PresenterQuestion } from './presenter-view'

/**
 * ANTI-COPY DETERRENCE NOTE:
 * Text selection, right-click disabling, and tab-switch/blur monitoring are implemented
 * strictly as light deterrence, not proctoring. They are designed to discourage casual
 * cheating in informal or classroom quiz environments.
 */

export interface IntegrityAlert {
  id: string
  playerId: string
  playerName: string
  action: string
  timestamp: string
}

interface ControlViewProps {
  status: string
  currentQuestion: PresenterQuestion | null
  questionIndex: number
  totalQuestions: number
  remainingSeconds: number
  players: PresenterPlayer[]
  answersCount: number
  countdownSeconds?: number
  autoAdvance?: boolean
  onToggleAutoAdvance?: (val: boolean) => void
  autoAdvanceSeconds?: number | null
  onStart: () => void
  onNextQuestion: () => void
  onEndQuestion: () => void
  onShowLeaderboard: () => void
  onExtendTimer: () => void
  onEndGame: () => void
  onKickPlayer: (playerId: string) => void
  tabSwitchAlerts: { [playerId: string]: number }
  integrityAlerts?: IntegrityAlert[]
}

export function ControlView({
  status,
  currentQuestion,
  questionIndex,
  totalQuestions,
  remainingSeconds,
  players,
  answersCount,
  countdownSeconds = 5,
  autoAdvance = true,
  onToggleAutoAdvance,
  autoAdvanceSeconds = null,
  onStart,
  onNextQuestion,
  onEndQuestion,
  onShowLeaderboard,
  onExtendTimer,
  onEndGame,
  onKickPlayer,
  tabSwitchAlerts,
  integrityAlerts = [],
}: ControlViewProps) {
  const isLastQuestion = questionIndex >= totalQuestions - 1

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4">
      {/* Current Game Control Status Card */}
      <Card className="border shadow-md">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Host Controls</CardTitle>
            <div className="flex items-center gap-3">
              {onToggleAutoAdvance && (
                <div className="flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-full shadow-xs">
                  <Switch
                    id="auto-advance"
                    checked={autoAdvance}
                    onCheckedChange={onToggleAutoAdvance}
                  />
                  <Label
                    htmlFor="auto-advance"
                    className="text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Auto-Pilot
                  </Label>
                </div>
              )}
              <Badge className="capitalize font-semibold">{status}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Main Action Buttons depending on status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {status === 'lobby' && (
              <Button
                onClick={onStart}
                className="w-full py-6 text-base font-bold gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="h-5 w-5 fill-current" /> Start Quiz (5s Countdown)
              </Button>
            )}

            {status === 'countdown' && (
              <Button
                disabled
                className="w-full py-6 text-base font-bold gap-2 bg-amber-600 text-white cursor-not-allowed animate-pulse"
              >
                <Clock className="h-5 w-5 animate-spin" /> Starting in {countdownSeconds}s...
              </Button>
            )}

            {status === 'live' && (
              <>
                <Button
                  onClick={onEndQuestion}
                  variant="destructive"
                  className="py-5 font-bold gap-2"
                >
                  <StopCircle className="h-5 w-5" /> End Question Early
                </Button>
                <Button
                  onClick={onExtendTimer}
                  variant="outline"
                  className="py-5 font-bold gap-2"
                >
                  <Clock className="h-5 w-5" /> Extend Timer (+15s)
                </Button>
              </>
            )}

            {status === 'question_ended' && (
              <Button
                onClick={onShowLeaderboard}
                className="w-full py-6 text-base font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Trophy className="h-5 w-5" />
                {autoAdvance && autoAdvanceSeconds !== null
                  ? `Show Leaderboard (Auto in ${autoAdvanceSeconds}s)`
                  : 'Show Leaderboard'}
              </Button>
            )}

            {status === 'leaderboard' && (
              <>
                {!isLastQuestion ? (
                  <Button
                    onClick={onNextQuestion}
                    className="w-full py-6 text-base font-bold gap-2 bg-primary text-primary-foreground"
                  >
                    <SkipForward className="h-5 w-5" />
                    {autoAdvance && autoAdvanceSeconds !== null
                      ? `Next Question (${questionIndex + 2}/${totalQuestions}) (Auto in ${autoAdvanceSeconds}s)`
                      : `Next Question (${questionIndex + 2}/${totalQuestions})`}
                  </Button>
                ) : (
                  <Button
                    onClick={onEndGame}
                    className="w-full py-6 text-base font-bold gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Trophy className="h-5 w-5" />
                    {autoAdvance && autoAdvanceSeconds !== null
                      ? `Show Final Podium (Auto in ${autoAdvanceSeconds}s)`
                      : 'Show Final Podium'}
                  </Button>
                )}
              </>
            )}

            {status !== 'ended' && status !== 'lobby' && (
              <Button
                onClick={onEndGame}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                End Session
              </Button>
            )}
          </div>

          {/* Current Question Inspector for Host */}
          {currentQuestion && (
            <div className="rounded-xl border p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Question {questionIndex + 1} of {totalQuestions}
                </span>
                <span className="font-mono font-bold text-foreground">
                  Time Left: {remainingSeconds}s | Answers: {answersCount}/{players.length}
                </span>
              </div>
              <div className="font-bold text-base">{currentQuestion.text}</div>
              <div className="space-y-1 text-xs">
                {currentQuestion.options.map((opt: string, idx: number) => {
                  const isCorrect = currentQuestion.correct_index === idx
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-1.5 rounded ${
                        isCorrect
                          ? 'font-bold text-green-700 dark:text-green-400 bg-green-500/10'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + idx)}.</span>
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-green-500" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-Copy Deterrence & Tab-Switch Alerts */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Integrity Deterrence Monitor</CardTitle>
            {integrityAlerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono">
                {integrityAlerts.length} events
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-[10px]">
            Deterrence, not proctoring
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {integrityAlerts.length === 0 && Object.keys(tabSwitchAlerts).length === 0 ? (
            <div className="text-xs text-muted-foreground italic text-center py-4">
              No window blur, tab-switch, copy, or screenshot attempts detected.
            </div>
          ) : (
            <>
              {/* Live Action Feed */}
              {integrityAlerts.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Live Integrity Activity ({integrityAlerts.length})
                  </div>
                  {integrityAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60 text-xs shadow-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-foreground truncate max-w-[130px]">
                          {alert.playerName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {alert.timestamp}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {alert.action.toLowerCase().includes('screenshot') ? (
                          <Badge variant="destructive" className="gap-1 text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700">
                            <Camera className="h-3 w-3" /> {alert.action}
                          </Badge>
                        ) : alert.action.toLowerCase().includes('tab switched') ? (
                          <Badge className="gap-1 text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700">
                            <Layers className="h-3 w-3" /> {alert.action}
                          </Badge>
                        ) : alert.action.toLowerCase().includes('unfocused') || alert.action.toLowerCase().includes('blur') ? (
                          <Badge className="gap-1 text-[11px] font-semibold bg-orange-600 text-white hover:bg-orange-700">
                            <Minimize2 className="h-3 w-3" /> {alert.action}
                          </Badge>
                        ) : alert.action.toLowerCase().includes('copy') || alert.action.toLowerCase().includes('cut') ? (
                          <Badge className="gap-1 text-[11px] font-semibold bg-yellow-600 text-white hover:bg-yellow-700">
                            <Copy className="h-3 w-3" /> {alert.action}
                          </Badge>
                        ) : alert.action.toLowerCase().includes('devtools') || alert.action.toLowerCase().includes('inspect') ? (
                          <Badge className="gap-1 text-[11px] font-semibold bg-purple-600 text-white hover:bg-purple-700">
                            <Terminal className="h-3 w-3" /> {alert.action}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[11px] font-semibold">
                            <MousePointer className="h-3 w-3" /> {alert.action}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Player Cumulative Blur Counts */}
              {Object.keys(tabSwitchAlerts).length > 0 && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Blur Counts by Player
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(tabSwitchAlerts).map(([pId, count]) => {
                      const player = players.find((p) => p.id === pId)
                      return (
                        <div
                          key={pId}
                          className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-foreground"
                        >
                          <span className="font-semibold truncate max-w-[120px]">
                            {player?.display_name || 'Player'}
                          </span>
                          <Badge variant="destructive" className="text-[10px] font-mono">
                            {count} {count === 1 ? 'blur' : 'blurs'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Live Leaderboard & Connected Players */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">
              Live Leaderboard & Roster ({players.length})
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Live Rankings
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {players.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              Waiting for players to join...
            </div>
          ) : (
            <div className="divide-y text-xs">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => {
                  const rank = idx + 1
                  const rankBadge =
                    rank === 1 ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-xs">
                        1
                      </span>
                    ) : rank === 2 ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white font-bold text-[10px] shadow-xs">
                        2
                      </span>
                    ) : rank === 3 ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700 text-white font-bold text-[10px] shadow-xs">
                        3
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[10px]">
                        {rank}
                      </span>
                    )

                  return (
                    <div key={p.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rankBadge}
                        <Avatar className="h-7 w-7 border shrink-0">
                          <AvatarImage src={getAvatarUrl(p.avatar)} />
                          <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm truncate max-w-[140px]">
                          {p.display_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-primary">
                          {p.score} <span className="text-[10px] text-muted-foreground font-normal">pts</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onKickPlayer(p.id)}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive gap-1"
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
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
