'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getHostRoomData,
  startCountdownAction,
  startRoomAction,
  nextQuestionAction,
  endQuestionAction,
  showLeaderboardAction,
  endGameAction,
  kickPlayerAction,
} from './actions'
import { PresenterPlayer, PresenterQuestion } from '@/components/live-room/presenter-view'
import { RealtimeChannel } from '@supabase/supabase-js'
import { PresenterView } from '@/components/live-room/presenter-view'
import { ControlView, IntegrityAlert } from '@/components/live-room/control-view'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ScreenShare, Smartphone, ArrowLeft, Loader2, Trophy } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ code: string }>
}

interface HostSession {
  id: string
  room_code: string
  status: string
  current_question_index: number
  question_started_at: string | null
  scheduled_at?: string | null
  settings?: Record<string, unknown>
}

interface HostQuiz {
  id: string
  title: string
  theme: string
}

export default function HostRoomPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const roomCode = resolvedParams.code.toUpperCase()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'presenter' | 'control'>('presenter')

  const [session, setSession] = useState<HostSession | null>(null)
  const [quiz, setQuiz] = useState<HostQuiz | null>(null)
  const [questions, setQuestions] = useState<PresenterQuestion[]>([])
  const [players, setPlayers] = useState<PresenterPlayer[]>([])
  const [answersCount, setAnswersCount] = useState(0)
  const [answerDistribution, setAnswerDistribution] = useState<{ [key: number]: number }>({})
  const [remainingSeconds, setRemainingSeconds] = useState(20)
  const [tabSwitchAlerts, setTabSwitchAlerts] = useState<{ [playerId: string]: number }>({})
  const [integrityAlerts, setIntegrityAlerts] = useState<IntegrityAlert[]>([])
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(5)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number | null>(null)
  const [showLiveLeaderboardModal, setShowLiveLeaderboardModal] = useState(false)

  const currentQIndex = session?.current_question_index ?? 0
  const currentQuestion = questions[currentQIndex] || null

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // 1. Initial Load
  useEffect(() => {
    let isMounted = true
    getHostRoomData(roomCode)
      .then((data) => {
        if (isMounted) {
          setSession(data.session)
          setQuiz(data.quiz)
          setQuestions(
            (data.questions || []).map((q: {
              id: string
              text: string
              options: string | string[]
              correct_index: number
              timer_seconds?: number
            }) => ({
              ...q,
              options: Array.isArray(q.options)
                ? q.options
                : typeof q.options === 'string'
                ? JSON.parse(q.options)
                : [],
            }))
          )
          setPlayers(data.players)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error('Failed to load host room')
          router.push('/dashboard')
        }
      })
    return () => {
      isMounted = false
    }
  }, [roomCode, router])

  // 2. Realtime Broadcast & Presence Setup
  useEffect(() => {
    if (!session?.id) return

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: 'host' } },
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        setPlayers((prev) => {
          if (prev.some((p) => p.id === payload.player.id)) return prev
          return [...prev, payload.player]
        })
      })
      .on('broadcast', { event: 'player_answered' }, async ({ payload }) => {
        setAnswersCount((prev) => prev + 1)
        if (payload?.selectedIndex !== undefined) {
          setAnswerDistribution((prev) => ({
            ...prev,
            [payload.selectedIndex]: (prev[payload.selectedIndex] || 0) + 1,
          }))
        }
        try {
          const fresh = await getHostRoomData(roomCode)
          setPlayers(fresh.players)
        } catch {}
      })
      .on('broadcast', { event: 'tab_switched' }, ({ payload }) => {
        if (payload?.playerId) {
          setTabSwitchAlerts((prev) => ({
            ...prev,
            [payload.playerId]: (prev[payload.playerId] || 0) + 1,
          }))
        }
      })
      .on('broadcast', { event: 'integrity_alert' }, ({ payload }) => {
        if (payload?.action) {
          const newAlert: IntegrityAlert = {
            id: payload.id || crypto.randomUUID(),
            playerId: payload.playerId || 'unknown',
            playerName: payload.playerName || 'Player',
            action: payload.action,
            timestamp: payload.timestamp || new Date().toLocaleTimeString(),
          }
          setIntegrityAlerts((prev) => [newAlert, ...prev.slice(0, 49)])
          if (payload.playerId) {
            setTabSwitchAlerts((prev) => ({
              ...prev,
              [payload.playerId]: (prev[payload.playerId] || 0) + 1,
            }))
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          try {
            const fresh = await getHostRoomData(roomCode)
            setPlayers(fresh.players)
          } catch {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          setAnswersCount((prev) => prev + 1)
          try {
            const fresh = await getHostRoomData(roomCode)
            setPlayers(fresh.players)
          } catch {}
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id, roomCode, supabase])

  // Active sync for lobby players so no page reload is ever needed
  useEffect(() => {
    if (!session?.id || session?.status !== 'lobby') return
    const syncInterval = setInterval(async () => {
      try {
        const fresh = await getHostRoomData(roomCode)
        setPlayers(fresh.players)
      } catch {}
    }, 2000)
    return () => clearInterval(syncInterval)
  }, [session?.id, session?.status, roomCode])

  // 3. Broadcast helper
  const broadcastEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    }
  }, [])

  // 4. Host Actions
  const handleStart = useCallback(async () => {
    if (!session?.id || isCountingDown) return
    setIsCountingDown(true)
    setCountdownSeconds(5)

    try {
      const { countdownUntil } = await startCountdownAction(session.id, 5)

      // Broadcast 5-second countdown to all connected players and presenters
      broadcastEvent('countdown_started', {
        seconds: 5,
        questionIndex: 0,
        countdownUntil,
      })

      let currentSec = 5
      const cdInterval = setInterval(async () => {
        currentSec -= 1
        if (currentSec > 0) {
          setCountdownSeconds(currentSec)
        } else {
          clearInterval(cdInterval)
          setIsCountingDown(false)
          try {
            const updated = await startRoomAction(session.id)
            setSession(updated)
            setAnswersCount(0)
            setAnswerDistribution({})

            const q = questions[0]
            broadcastEvent('question_started', {
              questionId: q?.id,
              questionIndex: 0,
              questionText: q?.text,
              options: q?.options,
              timerSeconds: q?.timer_seconds || 20,
              startedAt: updated.question_started_at,
            })
            toast.success('Quiz started!')
          } catch {
            toast.error('Failed to start quiz')
          }
        }
      }, 1000)
    } catch {
      setIsCountingDown(false)
      toast.error('Failed to initiate countdown')
    }
  }, [session?.id, isCountingDown, broadcastEvent, questions])

  const handleEndQuestion = useCallback(async () => {
    if (!session?.id) return
    try {
      const updated = await endQuestionAction(session.id)
      setSession(updated)

      const freshData = await getHostRoomData(roomCode)
      setPlayers(freshData.players)

      const q = questions[currentQIndex]
      broadcastEvent('question_ended', {
        correctIndex: q?.correct_index,
        leaderboard: freshData.players.slice(0, 5),
      })
    } catch {
      toast.error('Failed to end question')
    }
  }, [session?.id, roomCode, questions, currentQIndex, broadcastEvent])

  const handleShowLeaderboard = useCallback(async () => {
    if (!session?.id) return
    try {
      const updated = await showLeaderboardAction(session.id)
      setSession(updated)

      const freshData = await getHostRoomData(roomCode)
      setPlayers(freshData.players)

      broadcastEvent('show_leaderboard', {
        leaderboard: freshData.players.slice(0, 5),
      })
    } catch {
      toast.error('Failed to show leaderboard')
    }
  }, [session?.id, roomCode, broadcastEvent])

  const handleNextQuestion = useCallback(async () => {
    if (!session?.id) return
    try {
      const nextIdx = currentQIndex + 1
      const updated = await nextQuestionAction(session.id, nextIdx)
      setSession(updated)
      setAnswersCount(0)
      setAnswerDistribution({})

      const nextQ = questions[nextIdx]
      broadcastEvent('question_started', {
        questionId: nextQ?.id,
        questionIndex: nextIdx,
        questionText: nextQ?.text,
        options: nextQ?.options,
        timerSeconds: nextQ?.timer_seconds || 20,
        startedAt: updated.question_started_at,
      })
    } catch {
      toast.error('Failed to load next question')
    }
  }, [session?.id, currentQIndex, questions, broadcastEvent])

  const handleExtendTimer = useCallback(async () => {
    if (!session?.id) return
    try {
      setRemainingSeconds((prev) => prev + 15)
      broadcastEvent('timer_extended', { addedSeconds: 15 })
      toast.success('Extended question by 15s')
    } catch {
      toast.error('Failed to extend timer')
    }
  }, [session?.id, broadcastEvent])

  const handleEndGame = useCallback(async () => {
    if (!session?.id) return
    try {
      const updated = await endGameAction(session.id)
      setSession(updated)

      const freshData = await getHostRoomData(roomCode)
      setPlayers(freshData.players)

      broadcastEvent('game_ended', {
        podium: freshData.players.slice(0, 3),
        fullLeaderboard: freshData.players,
      })
      toast.success('Game ended! Final podium revealed.')
    } catch {
      toast.error('Failed to end game')
    }
  }, [session?.id, roomCode, broadcastEvent])

  const handleKickPlayer = useCallback(async (playerId: string) => {
    if (!session?.id) return
    try {
      await kickPlayerAction(session.id, playerId)
      setPlayers((prev) => prev.filter((p) => p.id !== playerId))
      broadcastEvent('player_kicked', { playerId })
      toast.success('Player removed from game')
    } catch {
      toast.error('Failed to kick player')
    }
  }, [session?.id, broadcastEvent])

  // 5. Server-Authoritative Timer Interval for Live Question
  useEffect(() => {
    if (session?.status !== 'live' || !session?.question_started_at || !currentQuestion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const timerSec = currentQuestion.timer_seconds || 20
    const startedAt = new Date(session.question_started_at).getTime()

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const left = Math.max(0, timerSec - elapsed)
      setRemainingSeconds(left)

      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        handleEndQuestion()
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session?.status, session?.question_started_at, currentQuestion, handleEndQuestion])

  // 6. Complete Autonomy: Early End Question when all joined players have answered
  useEffect(() => {
    if (
      session?.status === 'live' &&
      autoAdvance &&
      players.length > 0 &&
      answersCount >= players.length
    ) {
      const earlyEndTimeout = setTimeout(() => {
        handleEndQuestion()
      }, 1500)
      return () => clearTimeout(earlyEndTimeout)
    }
  }, [session?.status, autoAdvance, players.length, answersCount, handleEndQuestion])

  // 7. Complete Autonomy: Auto-Advance from question_ended to leaderboard (4s)
  useEffect(() => {
    if (session?.status !== 'question_ended' || !autoAdvance) {
      if (session?.status !== 'leaderboard') setAutoAdvanceSeconds(null)
      return
    }

    setAutoAdvanceSeconds(4)
    let left = 4
    const interval = setInterval(() => {
      left -= 1
      if (left > 0) {
        setAutoAdvanceSeconds(left)
      } else {
        clearInterval(interval)
        setAutoAdvanceSeconds(null)
        handleShowLeaderboard()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session?.status, autoAdvance, handleShowLeaderboard])

  // 8. Complete Autonomy: Auto-Advance from leaderboard to next question or podium (5s)
  useEffect(() => {
    if (session?.status !== 'leaderboard' || !autoAdvance) {
      return
    }

    setAutoAdvanceSeconds(5)
    let left = 5
    const interval = setInterval(() => {
      left -= 1
      if (left > 0) {
        setAutoAdvanceSeconds(left)
      } else {
        clearInterval(interval)
        setAutoAdvanceSeconds(null)
        if (currentQIndex < questions.length - 1) {
          handleNextQuestion()
        } else {
          handleEndGame()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    session?.status,
    autoAdvance,
    currentQIndex,
    questions.length,
    handleNextQuestion,
    handleEndGame,
  ])

  // 9. Scheduled Quiz Auto-Start: Trigger countdown the moment scheduled time arrives
  useEffect(() => {
    if (!session?.scheduled_at) return
    if (session.status !== 'lobby' && session.status !== 'scheduled') return
    if (isCountingDown) return

    const checkScheduled = () => {
      const scheduledTime = new Date(session.scheduled_at!).getTime()
      if (Date.now() >= scheduledTime) {
        handleStart()
      }
    }

    checkScheduled()
    const scheduledTimer = setInterval(checkScheduled, 1000)
    return () => clearInterval(scheduledTimer)
  }, [session?.scheduled_at, session?.status, isCountingDown, handleStart])

  if (loading || !session) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const joinUrl = `${siteUrl}/room/${roomCode}`

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar with View Mode Toggle */}
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1 text-xs' })}
          >
            <ArrowLeft className="h-4 w-4" /> Exit
          </Link>
          <div className="font-bold text-sm tracking-tight hidden sm:block">
            {quiz?.title} <span className="font-mono text-muted-foreground font-normal">({roomCode})</span>
          </div>
        </div>

        {/* Header Right Controls: Live Leaderboard + View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLiveLeaderboardModal(true)}
            className="gap-1.5 text-xs font-semibold h-9 shadow-xs"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Live</span> Leaderboard
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {players.length}
            </Badge>
          </Button>

          {/* View Mode Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(val) => setViewMode(val as 'presenter' | 'control')}
          >
            <TabsList className="h-9">
              <TabsTrigger value="presenter" className="gap-1.5 text-xs">
                <ScreenShare className="h-3.5 w-3.5" /> Presenter View
              </TabsTrigger>
              <TabsTrigger value="control" className="gap-1.5 text-xs">
                <Smartphone className="h-3.5 w-3.5" /> Control View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main View Area */}
      <main className="py-6">
        {viewMode === 'presenter' ? (
          <PresenterView
            roomCode={roomCode}
            status={isCountingDown ? 'countdown' : session.status}
            quizTitle={quiz?.title || 'Live Quiz'}
            currentQuestion={currentQuestion}
            questionIndex={currentQIndex}
            totalQuestions={questions.length}
            remainingSeconds={remainingSeconds}
            players={players}
            answersCount={answersCount}
            answerDistribution={answerDistribution}
            joinUrl={joinUrl}
            countdownSeconds={countdownSeconds}
            autoAdvanceSeconds={autoAdvanceSeconds}
          />
        ) : (
          <ControlView
            status={isCountingDown ? 'countdown' : session.status}
            currentQuestion={currentQuestion}
            questionIndex={currentQIndex}
            totalQuestions={questions.length}
            remainingSeconds={remainingSeconds}
            players={players}
            answersCount={answersCount}
            countdownSeconds={countdownSeconds}
            autoAdvance={autoAdvance}
            onToggleAutoAdvance={setAutoAdvance}
            autoAdvanceSeconds={autoAdvanceSeconds}
            onStart={handleStart}
            onNextQuestion={handleNextQuestion}
            onEndQuestion={handleEndQuestion}
            onShowLeaderboard={handleShowLeaderboard}
            onExtendTimer={handleExtendTimer}
            onEndGame={handleEndGame}
            onKickPlayer={handleKickPlayer}
            tabSwitchAlerts={tabSwitchAlerts}
            integrityAlerts={integrityAlerts}
          />
        )}
      </main>

      {/* Live Leaderboard Modal Dialog for Host */}
      <Dialog open={showLiveLeaderboardModal} onOpenChange={setShowLiveLeaderboardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <DialogTitle className="text-lg font-bold">Live Leaderboard</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Real-time rankings for {quiz?.title || 'this session'} ({roomCode})
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto divide-y text-xs py-2">
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">
                No players joined yet.
              </div>
            ) : (
              [...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => {
                  const rank = idx + 1
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2.5 px-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rank === 1 ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white font-bold text-xs shadow-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-700 text-white font-bold text-xs shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-xs font-semibold">
                            {rank}
                          </span>
                        )}
                        <Avatar className="h-8 w-8 border shrink-0">
                          <AvatarImage src={getAvatarUrl(p.avatar)} />
                          <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm truncate max-w-[160px]">
                          {p.display_name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-primary">
                        {p.score} <span className="text-[10px] text-muted-foreground font-normal">pts</span>
                      </span>
                    </div>
                  )
                })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
