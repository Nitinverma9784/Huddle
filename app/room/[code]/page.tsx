'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { AVATAR_OPTIONS, getAvatarUrl } from '@/lib/avatar'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Loader2,
  UserX,
  Sparkles,
} from 'lucide-react'

/**
 * ANTI-COPY DETERRENCE IMPLEMENTATION:
 * The player question screen has CSS `user-select: none`, right-click prevention,
 * and copy/cut keyboard shortcut blockers. It also attaches blur and visibilitychange
 * event listeners during questions to log tab-switching to the server.
 * As noted in the specifications, this is deterrence against casual browsing, not proctoring.
 */

interface PlayerQuestion {
  id?: string
  text: string
  options: string[]
  timer_seconds?: number
}

interface PlayerLeaderboardItem {
  id: string
  display_name: string
  avatar: string
  score: number
}

interface PageProps {
  params: Promise<{ code: string }>
}

export default function PlayerRoomPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const roomCode = resolvedParams.code.toUpperCase()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [kicked, setKicked] = useState(false)

  // Join form state
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('1')

  // Game state
  const [gameStatus, setGameStatus] = useState<string>('lobby')
  const [countdownSeconds, setCountdownSeconds] = useState(5)
  const [currentQuestion, setCurrentQuestion] = useState<PlayerQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(20)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean
    pointsAwarded: number
    speedBonus?: number
    newScore: number
  } | null>(null)
  const [playerScore, setPlayerScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboardItem[]>([])

  const playerIdRef = useRef<string | null>(null)
  const playerTokenRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // 1. Realtime Channel Subscription (Subscribed immediately on mount so it is ready before join)
  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: true } },
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'countdown_started' }, ({ payload }) => {
        setGameStatus('countdown')
        setCountdownSeconds(payload?.seconds || 5)
      })
      .on('broadcast', { event: 'question_started' }, ({ payload }) => {
        setGameStatus('live')
        setCurrentQuestion({
          id: payload.questionId,
          text: payload.questionText,
          options: payload.options,
          timer_seconds: payload.timerSeconds,
        })
        setQuestionIndex(payload.questionIndex)
        setRemainingSeconds(payload.timerSeconds || 20)
        setSelectedAnswer(null)
        setHasAnswered(false)
        setAnswerResult(null)
      })
      .on('broadcast', { event: 'question_ended' }, ({ payload }) => {
        setGameStatus('question_ended')
        if (payload?.leaderboard) setLeaderboard(payload.leaderboard)
      })
      .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
        setGameStatus('leaderboard')
        if (payload?.leaderboard) setLeaderboard(payload.leaderboard)
      })
      .on('broadcast', { event: 'timer_extended' }, ({ payload }) => {
        setRemainingSeconds((prev) => prev + (payload?.addedSeconds || 15))
        toast.info('Host extended question time by 15 seconds!')
      })
      .on('broadcast', { event: 'game_ended' }, ({ payload }) => {
        setGameStatus('ended')
        if (payload?.podium) setLeaderboard(payload.podium)
        confetti({ particleCount: 100, spread: 70 })
      })
      .on('broadcast', { event: 'player_kicked' }, ({ payload }) => {
        if (payload?.playerId === playerIdRef.current) {
          setKicked(true)
          localStorage.removeItem(`huddle_player_${roomCode}`)
          toast.error('You were removed from this room')
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode, supabase])

  // 2. Join Room Action
  const handleJoin = useCallback(async (existingToken?: string) => {
    if (!existingToken && !displayName.trim()) {
      toast.error('Please enter a nickname')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          display_name: displayName.trim() || 'Player',
          avatar: selectedAvatar,
          token: existingToken,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join')
      }

      const player = data.player
      playerIdRef.current = player.id
      playerTokenRef.current = player.token
      sessionIdRef.current = player.session_id || data.session?.id || null
      setPlayerScore(player.score || 0)
      setIsJoined(true)

      // Save token in localStorage for 30s reconnect tolerance
      localStorage.setItem(
        `huddle_player_${roomCode}`,
        JSON.stringify({
          id: player.id,
          token: player.token,
          name: player.display_name,
          avatar: player.avatar,
        })
      )

      // Late-joiner instant synchronization: immediately set active game state
      if (data.session) {
        const sess = data.session
        const cdUntil = sess.settings?.countdown_until
          ? new Date(sess.settings.countdown_until).getTime()
          : null

        if (cdUntil && cdUntil > Date.now()) {
          setGameStatus('countdown')
          setCountdownSeconds(Math.max(1, Math.ceil((cdUntil - Date.now()) / 1000)))
        } else if (sess.status === 'live' && data.current_question) {
          setGameStatus('live')
          setCurrentQuestion(data.current_question)
          setQuestionIndex(sess.current_question_index || 0)
          const elapsed = sess.question_started_at
            ? Math.floor((Date.now() - new Date(sess.question_started_at).getTime()) / 1000)
            : 0
          const qTimer = data.current_question.timer_seconds || 20
          setRemainingSeconds(Math.max(0, qTimer - elapsed))
        } else if (sess.status === 'question_ended') {
          setGameStatus('question_ended')
          if (data.current_question) setCurrentQuestion(data.current_question)
        } else if (sess.status === 'leaderboard') {
          setGameStatus('leaderboard')
          if (data.leaderboard) setLeaderboard(data.leaderboard)
        } else if (sess.status === 'ended') {
          setGameStatus('ended')
          if (data.leaderboard) setLeaderboard(data.leaderboard)
        }
      }

      // Broadcast join to host immediately
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { player },
        })
      }

      toast.success(data.reconnected ? 'Reconnected to game!' : `Welcome, ${player.display_name}!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error joining room'
      toast.error(msg)
      localStorage.removeItem(`huddle_player_${roomCode}`)
    } finally {
      setLoading(false)
    }
  }, [displayName, roomCode, selectedAvatar])

  // 3. Check for Reconnect on Mount
  useEffect(() => {
    const saved = localStorage.getItem(`huddle_player_${roomCode}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.id && parsed.token) {
          playerIdRef.current = parsed.id
          playerTokenRef.current = parsed.token
          const timeoutId = setTimeout(() => {
            setDisplayName(parsed.name || '')
            setSelectedAvatar(parsed.avatar || '1')
            handleJoin(parsed.token)
          }, 0)
          return () => clearTimeout(timeoutId)
        }
      } catch (e) {
        console.warn('Invalid saved player token', e)
      }
    }
  }, [roomCode, handleJoin])

  // 4. Active Lobby & Live Question Polling (Ensures players dynamic sync even if websocket dropped)
  useEffect(() => {
    if (!isJoined || !sessionIdRef.current) return
    const syncInterval = setInterval(async () => {
      try {
        const { data: session } = await supabase
          .from('sessions')
          .select('status, current_question_index, question_started_at, quiz_id, settings')
          .eq('id', sessionIdRef.current)
          .single()

        if (!session) return

        const cdUntil = session.settings?.countdown_until
          ? new Date(session.settings.countdown_until).getTime()
          : null

        if (cdUntil && cdUntil > Date.now()) {
          if (gameStatus !== 'countdown') {
            setGameStatus('countdown')
            setCountdownSeconds(Math.max(1, Math.ceil((cdUntil - Date.now()) / 1000)))
          }
        } else if (
          session.status === 'live' &&
          (gameStatus !== 'live' || questionIndex !== session.current_question_index)
        ) {
          // Host started live quiz or moved to next question
          const { data: questions } = await supabase
            .from('questions')
            .select('id, text, options, timer_seconds')
            .eq('quiz_id', session.quiz_id)
            .order('order_index', { ascending: true })

          const q = questions?.[session.current_question_index]
          if (q) {
            setGameStatus('live')
            setCurrentQuestion({
              id: q.id,
              text: q.text,
              options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
              timer_seconds: q.timer_seconds,
            })
            setQuestionIndex(session.current_question_index)
            const elapsed = session.question_started_at
              ? Math.floor((Date.now() - new Date(session.question_started_at).getTime()) / 1000)
              : 0
            setRemainingSeconds(Math.max(0, (q.timer_seconds || 20) - elapsed))
            setSelectedAnswer(null)
            setHasAnswered(false)
            setAnswerResult(null)
          }
        } else if (session.status === 'question_ended' && gameStatus !== 'question_ended') {
          setGameStatus('question_ended')
        } else if (session.status === 'leaderboard' && gameStatus !== 'leaderboard') {
          setGameStatus('leaderboard')
        } else if (session.status === 'ended' && gameStatus !== 'ended') {
          setGameStatus('ended')
        }
      } catch {}
    }, 1500)

    return () => clearInterval(syncInterval)
  }, [isJoined, gameStatus, questionIndex, supabase])

  // 5. Countdown timer when question is live
  useEffect(() => {
    if (gameStatus !== 'live') return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, questionIndex])

  // 5.1 Countdown timer before Question 1 starts (5s countdown)
  useEffect(() => {
    if (gameStatus !== 'countdown') return

    const cdTimer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cdTimer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(cdTimer)
  }, [gameStatus])

  // 6. Anti-Copy Deterrence & Comprehensive Integrity Monitoring
  useEffect(() => {
    if (gameStatus !== 'live') return

    const sendIntegrityAlert = (action: string) => {
      if (channelRef.current && playerIdRef.current) {
        const payload = {
          id: crypto.randomUUID(),
          playerId: playerIdRef.current,
          playerName: displayName.trim() || 'Player',
          action,
          timestamp: new Date().toLocaleTimeString(),
        }

        channelRef.current.send({
          type: 'broadcast',
          event: 'integrity_alert',
          payload,
        })

        // Also broadcast backward-compatible tab_switched event
        if (
          action.toLowerCase().includes('tab') ||
          action.toLowerCase().includes('blur') ||
          action.toLowerCase().includes('window')
        ) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'tab_switched',
            payload: {
              playerId: playerIdRef.current,
              timestamp: Date.now(),
            },
          })
        }
      }
    }

    // Tab Switch (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendIntegrityAlert('Tab Switched / Minimized')
      }
    }

    // Window Unfocus (Blur / switching windows/apps)
    const handleWindowBlur = () => {
      sendIntegrityAlert('Window Unfocused / Switched App')
    }

    // Keyboard Shortcuts (Screenshots, Copy, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return

      // PrintScreen Screenshot
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.key === 'Snapshot') {
        sendIntegrityAlert('Screenshot Attempted (PrintScreen)')
      }

      // Windows Snipping Tool (Win+Shift+S) / Mac Screenshot (Cmd+Shift+3/4)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', 's', 'S'].includes(e.key)) {
        sendIntegrityAlert('Screenshot Shortcut Attempted')
      }

      // Print Page (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        sendIntegrityAlert('Print Page Attempted')
      }

      // Copy text shortcut (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        sendIntegrityAlert('Copy (Ctrl+C) Attempted')
      }

      // DevTools / Inspect (F12 or Ctrl+Shift+I/J/C)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault()
        sendIntegrityAlert('DevTools / Inspect Attempted')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        sendIntegrityAlert('Screenshot Attempted (PrintScreen)')
      }
    }

    // Copy / Cut Text Attempted
    const handleCopy = () => {
      sendIntegrityAlert('Copy Text Attempted')
    }

    const handleCut = () => {
      sendIntegrityAlert('Cut Text Attempted')
    }

    // Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      sendIntegrityAlert('Right Click / Context Menu Attempted')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [gameStatus, displayName])

  // 7. Submit Answer Action
  const handleAnswerClick = async (idx: number) => {
    if (hasAnswered || gameStatus !== 'live' || !currentQuestion) return

    setSelectedAnswer(idx)
    setHasAnswered(true)

    // Notify presenter of answer count increment
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_answered',
        payload: {
          playerId: playerIdRef.current,
          selectedIndex: idx,
        },
      })
    }

    try {
      const res = await fetch('/api/room/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          player_id: playerIdRef.current,
          player_token: playerTokenRef.current,
          question_id: currentQuestion?.id,
          selected_index: idx,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setAnswerResult({
          isCorrect: data.is_correct,
          pointsAwarded: data.points_awarded,
          speedBonus: data.speed_bonus,
          newScore: data.new_score,
        })
        setPlayerScore(data.new_score)
      }
    } catch {
      // Handled server-side
    }
  }

  // Render Kicked View
  if (kicked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <Card className="max-w-md w-full border shadow-lg p-6 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <UserX className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Removed from Room</CardTitle>
          <CardDescription>The host has removed you from this game session.</CardDescription>
        </Card>
      </div>
    )
  }

  // Render Join Form (if not joined)
  if (!isJoined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm border shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex items-center justify-center mb-2">
              <img src="/huddle-logo.png" alt="Huddle" className="h-12 w-auto object-contain select-none" />
            </div>
            <CardTitle className="text-2xl font-black">Join Game</CardTitle>
            <CardDescription>
              Room: <span className="font-mono font-bold text-foreground">{roomCode}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Your Nickname</Label>
              <Input
                placeholder="Enter your name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={25}
                className="text-base font-semibold"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Choose Your Avatar</Label>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {AVATAR_OPTIONS.map((av) => {
                  const isSelected = selectedAvatar === av.id || selectedAvatar === av.src
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`relative rounded-xl p-1 border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 scale-105 shadow-sm ring-2 ring-primary/30'
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-11 w-11 rounded-lg">
                        <AvatarImage src={av.src} alt={av.name} className="object-cover" />
                        <AvatarFallback>{av.id}</AvatarFallback>
                      </Avatar>
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              onClick={() => handleJoin()}
              disabled={loading || !displayName.trim()}
              className="w-full py-5 text-base font-bold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Joining...
                </>
              ) : (
                'Enter Game'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render In-Game Screens (with anti-copy deterrents)
  return (
    <div
      className="flex min-h-screen flex-col justify-between bg-background p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {/* Top Status Header */}
      <header className="flex items-center justify-between border-b pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={getAvatarUrl(selectedAvatar)} />
            <AvatarFallback>{displayName[0]}</AvatarFallback>
          </Avatar>
          <span className="font-bold text-sm truncate max-w-[120px]">{displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs font-bold">
            {playerScore} pts
          </Badge>
          <Badge className="font-mono text-xs">{roomCode}</Badge>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-6">
        {/* 1. LOBBY VIEW */}
        {gameStatus === 'lobby' && (
          <div className="text-center space-y-4 animate-in fade-in zoom-in-95">
            <Avatar className="h-28 w-28 mx-auto border-4 border-primary shadow-2xl">
              <AvatarImage src={getAvatarUrl(selectedAvatar)} />
              <AvatarFallback>{displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">You&apos;re in!</h2>
              <p className="text-sm text-muted-foreground animate-pulse">
                Look at the host&apos;s screen. Game will start soon...
              </p>
            </div>
          </div>
        )}

        {/* 1.5. GET READY 5-SECOND COUNTDOWN VIEW */}
        {gameStatus === 'countdown' && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-90 duration-300 w-full max-w-sm py-4">
            <Badge variant="outline" className="px-3.5 py-1.5 font-bold text-xs uppercase tracking-widest text-primary border-primary/40 bg-primary/10">
              Get Ready!
            </Badge>
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Question 1 Starting In</h2>
              <p className="text-sm text-muted-foreground">
                Get ready to pick the correct answer fast!
              </p>
            </div>
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 border-4 border-primary text-primary font-mono text-6xl font-black animate-pulse shadow-xl shadow-primary/20">
              {countdownSeconds}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Speed points active &bull; First answers score higher</span>
            </div>
          </div>
        )}

        {/* 2. LIVE QUESTION (Using refined shadcn Card, Badge, Progress & Buttons) */}
        {gameStatus === 'live' && currentQuestion && (
          <div className="w-full space-y-4 animate-in fade-in zoom-in-95">
            {/* Top Question Countdown Header */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                Question {questionIndex + 1}
              </Badge>
              <Badge
                variant={remainingSeconds <= 5 ? 'destructive' : 'secondary'}
                className="font-mono text-sm px-3 py-1 font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{remainingSeconds}s</span>
              </Badge>
            </div>

            {/* Time Countdown Progress Bar */}
            <Progress
              value={(remainingSeconds / (currentQuestion.timer_seconds || 20)) * 100}
              className="h-2 rounded-full"
            />

            {/* Question Text in shadcn Card */}
            <Card className="border shadow-md">
              <CardHeader className="p-5 text-center">
                <CardTitle className="text-xl sm:text-2xl font-extrabold leading-snug">
                  {currentQuestion.text}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Answer Options using elegant shadcn styling */}
            {!hasAnswered ? (
              <div className="grid grid-cols-1 gap-3 pt-1 w-full">
                {currentQuestion.options.map((opt: string, idx: number) => {
                  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']
                  const letter = optionLetters[idx] || String.fromCharCode(65 + idx)

                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      size="lg"
                      onClick={() => handleAnswerClick(idx)}
                      className="group relative h-auto min-h-[4rem] w-full p-4 rounded-2xl justify-start text-left border-2 border-border/80 bg-card hover:bg-accent/60 hover:border-primary/60 active:border-primary active:scale-[0.98] transition-all duration-150 shadow-xs hover:shadow-md cursor-pointer whitespace-normal"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-base font-extrabold text-foreground border border-border/80 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                        {letter}
                      </span>
                      <span className="leading-snug break-words flex-1 text-base font-semibold text-foreground px-1">
                        {opt}
                      </span>
                      <span className="h-2 w-2 rounded-full bg-border group-hover:bg-primary transition-colors shrink-0" />
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="w-full space-y-3">
                {/* Show the selected locked answer option in full context */}
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((opt: string, idx: number) => {
                    const isChosen = selectedAnswer === idx
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all ${
                          isChosen
                            ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30'
                            : 'border-border/40 bg-muted/20 opacity-50'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                            isChosen
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`text-sm flex-1 ${isChosen ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                          {opt}
                        </span>
                        {isChosen && (
                          <Badge variant="default" className="text-[10px] gap-1 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Locked
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>

                <Card className="border shadow-sm bg-muted/30">
                  <CardContent className="py-5 text-center space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <CardTitle className="font-extrabold text-base">
                      Answer Submitted!
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Waiting for timer to expire and other players to answer...
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* 3. QUESTION ENDED FEEDBACK */}
        {gameStatus === 'question_ended' && (
          <Card className="w-full border shadow-md text-center p-6 space-y-4 animate-in zoom-in-95">
            {answerResult ? (
              answerResult.isCorrect ? (
                <>
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-green-500 text-white shadow-xl">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-black text-green-600 dark:text-green-400">
                      Correct!
                    </CardTitle>
                    <p className="font-mono text-xl font-bold">
                      +{answerResult.pointsAwarded} pts
                    </p>
                    {answerResult.speedBonus ? (
                      <p className="text-xs text-muted-foreground font-semibold">
                        Speed Bonus: +{answerResult.speedBonus} pts
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-destructive text-white shadow-xl">
                    <XCircle className="h-12 w-12" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-black text-destructive">
                      Incorrect!
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">+0 points this round</p>
                  </div>
                </>
              )
            ) : (
              <div className="space-y-2 py-4">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                <CardTitle className="text-2xl font-bold">Time&apos;s Up!</CardTitle>
              </div>
            )}
          </Card>
        )}

        {/* 4. LEADERBOARD */}
        {gameStatus === 'leaderboard' && (
          <Card className="w-full border shadow-md text-center p-6 space-y-4 animate-in fade-in">
            <Trophy className="h-12 w-12 mx-auto text-amber-500 animate-bounce" />
            <CardTitle className="text-2xl font-black">Scoreboard</CardTitle>
            <p className="text-xs text-muted-foreground">
              Your score: <span className="font-bold text-foreground font-mono">{playerScore} pts</span>
            </p>
            {leaderboard.length > 0 ? (
              <div className="space-y-2 max-w-xs mx-auto text-left pt-2">
                {leaderboard.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getAvatarUrl(item.avatar)} />
                        <AvatarFallback>{item.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold truncate max-w-[120px]">
                        {idx + 1}. {item.display_name}
                      </span>
                    </div>
                    <span className="font-mono text-primary font-bold">{item.score} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pt-4 text-xs text-muted-foreground italic">
                Look at the big screen for full leaderboard rankings!
              </div>
            )}
          </Card>
        )}

        {/* 5. GAME ENDED */}
        {gameStatus === 'ended' && (
          <Card className="w-full border shadow-md text-center p-6 space-y-4 animate-in zoom-in-95">
            <Trophy className="h-16 w-16 mx-auto text-amber-500" />
            <CardTitle className="text-3xl font-black">Game Over!</CardTitle>
            <p className="text-lg font-bold">
              Final Score: <span className="text-primary font-mono">{playerScore} pts</span>
            </p>
            <CardDescription className="text-xs">
              Thanks for playing Huddle! Check the presenter screen for the final podium winners.
            </CardDescription>
          </Card>
        )}
      </main>

      {/* Footer / Anti-cheating footnote */}
      <footer className="text-center text-[10px] text-muted-foreground py-2 border-t max-w-lg mx-auto w-full">
        Huddle Live &bull; Powered by AI
      </footer>
    </div>
  )
}
