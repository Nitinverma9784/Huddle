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
  Zap,
  Crown,
  Medal,
  Lock,
  Home,
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
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null)
  const pendingAnswerResultRef = useRef<{
    is_correct: boolean
    points_awarded: number
    speed_bonus?: number
    new_score: number
    correct_index?: number
  } | null>(null)

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
        setIsAnswerRevealed(false)
        setCorrectAnswerIndex(null)
        pendingAnswerResultRef.current = null
      })
      .on('broadcast', { event: 'question_ended' }, ({ payload }) => {
        setGameStatus('question_ended')
        setIsAnswerRevealed(true)
        if (payload?.correctIndex !== undefined) {
          setCorrectAnswerIndex(payload.correctIndex)
        }
        if (pendingAnswerResultRef.current) {
          const res = pendingAnswerResultRef.current
          setAnswerResult({
            isCorrect: res.is_correct,
            pointsAwarded: res.points_awarded,
            speedBonus: res.speed_bonus,
            newScore: res.new_score,
          })
          setPlayerScore(res.new_score)
        }
        if (payload?.leaderboard) setLeaderboard(payload.leaderboard)
      })
      .on('broadcast', { event: 'show_leaderboard' }, ({ payload }) => {
        setGameStatus('leaderboard')
        if (payload?.leaderboard) setLeaderboard(payload.leaderboard)
      })
      .on('broadcast', { event: 'score_updated' }, ({ payload }) => {
        if (payload?.playerId && payload?.newScore !== undefined) {
          setLeaderboard((prev) => {
            const updated = prev.map((p) =>
              p.id === payload.playerId ? { ...p, score: payload.newScore } : p
            )
            return [...updated].sort((a, b) => b.score - a.score)
          })
        }
      })
      .on('broadcast', { event: 'timer_extended' }, ({ payload }) => {
        setRemainingSeconds((prev) => prev + (payload?.addedSeconds || 15))
        toast.info('Host extended question time by 15 seconds!')
      })
      .on('broadcast', { event: 'game_ended' }, ({ payload }) => {
        setGameStatus('ended')
        if (payload?.fullLeaderboard && payload.fullLeaderboard.length > 0) {
          setLeaderboard(payload.fullLeaderboard)
        } else if (payload?.podium && payload.podium.length > 0) {
          setLeaderboard(payload.podium)
        }
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
  const gameStatusRef = useRef(gameStatus)
  const questionIndexRef = useRef(questionIndex)

  useEffect(() => {
    gameStatusRef.current = gameStatus
    questionIndexRef.current = questionIndex
  }, [gameStatus, questionIndex])

  useEffect(() => {
    if (!isJoined || !sessionIdRef.current) return
    const syncInterval = setInterval(async () => {
      try {
        const { data: session } = await supabase
          .from('sessions')
          .select('status, current_question_index, question_started_at, quiz_id, settings, quizzes(default_timer_seconds)')
          .eq('id', sessionIdRef.current)
          .single()

        if (!session) return

        const cdUntil = session.settings?.countdown_until
          ? new Date(session.settings.countdown_until).getTime()
          : null

        if (cdUntil && cdUntil > Date.now()) {
          if (gameStatusRef.current !== 'countdown') {
            setGameStatus('countdown')
            setCountdownSeconds(Math.max(1, Math.ceil((cdUntil - Date.now()) / 1000)))
          }
        } else if (
          session.status === 'live' &&
          (gameStatusRef.current !== 'live' || questionIndexRef.current !== session.current_question_index)
        ) {
          // Host started live quiz or moved to next question
          const { data: questions } = await supabase
            .from('questions')
            .select('id, text, options, timer_seconds')
            .eq('quiz_id', session.quiz_id)
            .order('order_index', { ascending: true })

          const q = questions?.[session.current_question_index]
          if (q) {
            const defaultTimer =
              (session.quizzes as { default_timer_seconds?: number } | null)?.default_timer_seconds || 20
            const qTimer = q.timer_seconds || defaultTimer
            setGameStatus('live')
            setCurrentQuestion({
              id: q.id,
              text: q.text,
              options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
              timer_seconds: qTimer,
            })
            setQuestionIndex(session.current_question_index)
            const elapsed = session.question_started_at
              ? Math.floor((Date.now() - new Date(session.question_started_at).getTime()) / 1000)
              : 0
            setRemainingSeconds(Math.max(0, qTimer - elapsed))
            setSelectedAnswer(null)
            setHasAnswered(false)
            setAnswerResult(null)
            setIsAnswerRevealed(false)
            setCorrectAnswerIndex(null)
            pendingAnswerResultRef.current = null
          }
        } else if (session.status === 'question_ended' && gameStatusRef.current !== 'question_ended') {
          setGameStatus('question_ended')
          setIsAnswerRevealed(true)
          if (pendingAnswerResultRef.current) {
            const data = pendingAnswerResultRef.current
            setAnswerResult({
              isCorrect: data.is_correct,
              pointsAwarded: data.points_awarded,
              speedBonus: data.speed_bonus,
              newScore: data.new_score,
            })
            setPlayerScore(data.new_score)
            if (data.correct_index !== undefined) {
              setCorrectAnswerIndex(data.correct_index)
            }
          }
        } else if (session.status === 'leaderboard' && gameStatusRef.current !== 'leaderboard') {
          setGameStatus('leaderboard')
        } else if (session.status === 'ended' && gameStatusRef.current !== 'ended') {
          setGameStatus('ended')
        }
      } catch {}
    }, 1500)

    return () => clearInterval(syncInterval)
  }, [isJoined, supabase])

  // 5. Countdown timer when question is live (Uniform timing)
  useEffect(() => {
    if (gameStatus !== 'live') return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)

          // Uniform Reveal: Timer reaches 0!
          setIsAnswerRevealed(true)

          if (pendingAnswerResultRef.current) {
            const data = pendingAnswerResultRef.current
            setAnswerResult({
              isCorrect: data.is_correct,
              pointsAwarded: data.points_awarded,
              speedBonus: data.speed_bonus,
              newScore: data.new_score,
            })
            setPlayerScore(data.new_score)
            if (data.correct_index !== undefined) {
              setCorrectAnswerIndex(data.correct_index)
            }

            // Broadcast score_updated to room channel so host & player leaderboards update dynamically
            if (channelRef.current && playerIdRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'score_updated',
                payload: {
                  playerId: playerIdRef.current,
                  newScore: data.new_score,
                  pointsAwarded: data.points_awarded,
                  isCorrect: data.is_correct,
                },
              })
            }
          }

          // Uniform review period (3.5s) to view the revealed answer before advancing
          setTimeout(() => {
            fetch('/api/room/advance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_code: roomCode,
                current_index: questionIndexRef.current,
              }),
            }).catch(() => {})
          }, 3500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, questionIndex, roomCode])

  // 5.2 Fetch final leaderboard on game end
  useEffect(() => {
    if (gameStatus === 'ended' && sessionIdRef.current) {
      supabase
        .from('players')
        .select('id, display_name, avatar, score')
        .eq('session_id', sessionIdRef.current)
        .order('score', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setLeaderboard(data)
          }
        })
    }
  }, [gameStatus, supabase])

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
        // Uniform timing: store result in ref — DO NOT reveal red/green or update score until timer expires
        pendingAnswerResultRef.current = data
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
              <Zap className="h-4 w-4 text-primary" />
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

            {/* Answer Options */}
            <div className="grid grid-cols-1 gap-2.5 pt-1 w-full">
              {currentQuestion.options.map((opt: string, idx: number) => {
                const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F']
                const letter = optionLetters[idx] || String.fromCharCode(65 + idx)
                const isChosen = selectedAnswer === idx

                if (!hasAnswered) {
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
                }

                // After answering:
                let optionStyle = 'border-border/40 bg-muted/20 opacity-40'
                let letterStyle = 'bg-muted text-muted-foreground'
                let statusBadge = null

                if (!isAnswerRevealed) {
                  // Uniform Timing: Answer chosen, locked in, but timer is still running!
                  if (isChosen) {
                    optionStyle = 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm'
                    letterStyle = 'bg-primary text-primary-foreground font-bold'
                    statusBadge = (
                      <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/40 gap-1 animate-pulse">
                        <Lock className="h-3 w-3" /> Answer Locked
                      </Badge>
                    )
                  } else {
                    optionStyle = 'border-border/40 bg-muted/20 opacity-45'
                  }
                } else {
                  // Uniform Timing: Timer ended -> Reveal result!
                  const isCorrectChoice =
                    (isChosen && answerResult?.isCorrect) ||
                    (correctAnswerIndex !== null && idx === correctAnswerIndex)
                  const isIncorrectChoice = isChosen && answerResult && !answerResult.isCorrect

                  if (isCorrectChoice) {
                    // Correct: GREEN option
                    optionStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm'
                    letterStyle = 'bg-emerald-600 text-white font-bold'
                    statusBadge = (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct {isChosen && answerResult?.pointsAwarded ? `+${answerResult.pointsAwarded} pts` : ''}
                      </Badge>
                    )
                  } else if (isIncorrectChoice) {
                    // Incorrect: RED option (as requested: "incorrect should just show on option red")
                    optionStyle = 'border-red-500 bg-red-500/15 text-red-950 dark:text-red-100 ring-2 ring-red-500/40 shadow-sm'
                    letterStyle = 'bg-red-600 text-white font-bold'
                    statusBadge = (
                      <Badge variant="destructive" className="text-xs gap-1 font-bold">
                        <XCircle className="h-3.5 w-3.5" /> Incorrect
                      </Badge>
                    )
                  } else {
                    optionStyle = 'border-border/40 bg-muted/20 opacity-30'
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${optionStyle}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${letterStyle}`}
                    >
                      {letter}
                    </span>
                    <span className={`text-base flex-1 leading-snug break-words ${isChosen ? 'font-bold' : ''}`}>
                      {opt}
                    </span>
                    {statusBadge}
                  </div>
                )
              })}
            </div>

            {hasAnswered && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/40 border text-xs text-muted-foreground animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Score: {playerScore} pts</span>
                  {isAnswerRevealed && answerResult?.speedBonus ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      (+{answerResult.speedBonus} speed bonus)
                    </span>
                  ) : null}
                </div>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {!isAnswerRevealed ? 'Revealing answer when timer ends...' : 'Next question soon...'}
                </span>
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
              <div className="space-y-2.5 max-w-sm mx-auto text-left pt-2">
                {(() => {
                  const maxScore = Math.max(...leaderboard.map((p) => p.score), 100)
                  return leaderboard.slice(0, 5).map((item, idx) => {
                    const scorePercent =
                      maxScore > 0
                        ? Math.min(100, Math.max(item.score > 0 ? 5 : 0, Math.round((item.score / maxScore) * 100)))
                        : 0
                    const barColor =
                      idx === 0
                        ? 'bg-amber-500'
                        : idx === 1
                        ? 'bg-slate-400'
                        : idx === 2
                        ? 'bg-amber-700'
                        : 'bg-primary'

                    return (
                      <div
                        key={item.id}
                        className="animate-rise-up flex flex-col p-3 rounded-xl bg-card border text-xs space-y-2 shadow-xs"
                        style={{
                          animationDelay: `${(leaderboard.slice(0, 5).length - 1 - idx) * 140 + 80}ms`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={getAvatarUrl(item.avatar)} />
                              <AvatarFallback>{item.display_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold truncate max-w-[140px]">
                              {idx + 1}. {item.display_name}
                            </span>
                          </div>
                          <span
                            className="font-mono text-primary font-bold animate-result-reveal"
                            style={{
                              animationDelay: `${(leaderboard.slice(0, 5).length - 1 - idx) * 140 + 220}ms`,
                            }}
                          >
                            {item.score} pts
                          </span>
                        </div>
                        {/* Dynamic Leaderboard Progress Bar */}
                        <Progress
                          value={scorePercent}
                          indicatorClassName={barColor}
                          trackClassName="h-1.5 bg-muted/60"
                        />
                      </div>
                    )
                  })
                })()}
              </div>
            ) : (
              <div className="pt-4 text-xs text-muted-foreground italic">
                Look at the big screen for full leaderboard rankings!
              </div>
            )}
          </Card>
        )}

        {/* 5. GAME ENDED - COMPREHENSIVE LEADERBOARD & PODIUM */}
        {gameStatus === 'ended' && (() => {
          const sorted = [...leaderboard].sort((a, b) => b.score - a.score)
          const myRankIndex = sorted.findIndex((p) => p.id === playerIdRef.current)
          const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null
          const totalCount = sorted.length

          const first = sorted[0]
          const second = sorted[1]
          const third = sorted[2]

          return (
            <div className="w-full space-y-4 animate-in zoom-in-95 duration-200">
              {/* Header & Personal Card */}
              <Card className="border shadow-lg text-center p-5 pb-6 space-y-4 bg-gradient-to-b from-card to-muted/20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 shadow-inner">
                  <Trophy className="h-8 w-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">
                    Quiz Completed!
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Room <span className="font-mono font-bold text-foreground">{roomCode}</span> &bull; Final Standings
                  </CardDescription>
                </div>

                {/* Personal Rank & Score Card */}
                <div
                  className="animate-rise-up p-3.5 rounded-2xl border bg-card/90 shadow-xs flex items-center justify-between"
                  style={{ animationDelay: '100ms' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-primary/40 shadow-xs">
                      <AvatarImage src={getAvatarUrl(selectedAvatar)} />
                      <AvatarFallback>{displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-extrabold text-sm truncate max-w-[130px] flex items-center gap-1.5">
                        {displayName}
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">You</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {myRank === 1 ? (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <Crown className="h-3.5 w-3.5" /> 1st Place Champion!
                          </span>
                        ) : myRank === 2 ? (
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Medal className="h-3.5 w-3.5" /> 2nd Place Podium!
                          </span>
                        ) : myRank === 3 ? (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <Medal className="h-3.5 w-3.5" /> 3rd Place Podium!
                          </span>
                        ) : myRank ? (
                          <span>Rank #{myRank} of {totalCount}</span>
                        ) : (
                          <span>Participant</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-mono text-xl font-black text-primary animate-result-reveal"
                      style={{ animationDelay: '250ms' }}
                    >
                      {playerScore} <span className="text-xs font-medium text-muted-foreground">pts</span>
                    </div>
                    {myRank && (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Finish #{myRank}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Top 3 Podium Visual Display */}
                {sorted.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Podium Winners
                    </div>
                    <div className="flex items-end justify-center gap-2 max-w-sm mx-auto pt-2">
                      {/* 2nd Place */}
                      <div className="flex flex-col items-center flex-1">
                        {second ? (
                          <>
                            <div
                              className="animate-rise-up flex flex-col items-center"
                              style={{ animationDelay: '400ms' }}
                            >
                              <Avatar className="h-12 w-12 mb-1.5 border-2 border-slate-300 shadow-sm">
                                <AvatarImage src={getAvatarUrl(second.avatar)} />
                                <AvatarFallback>2</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-xs truncate max-w-[75px]">{second.display_name}</span>
                              <span
                                className="text-[10px] text-muted-foreground font-mono font-semibold animate-result-reveal"
                                style={{ animationDelay: '520ms' }}
                              >
                                {second.score} pts
                              </span>
                            </div>
                            <div
                              className="w-full h-16 bg-slate-300 dark:bg-slate-700 rounded-t-xl flex items-center justify-center font-black text-xl text-slate-700 dark:text-slate-200 mt-2 shadow-xs animate-pedestal"
                              style={{ animationDelay: '350ms' }}
                            >
                              2
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-16 rounded-t-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground opacity-40">
                            -
                          </div>
                        )}
                      </div>

                      {/* 1st Place */}
                      <div className="flex flex-col items-center flex-1">
                        {first ? (
                          <>
                            <div
                              className="animate-rise-up flex flex-col items-center"
                              style={{ animationDelay: '700ms' }}
                            >
                              <Crown className="h-5 w-5 text-amber-500 mb-0.5 animate-bounce" />
                              <Avatar className="h-14 w-14 mb-1.5 border-2 border-amber-400 shadow-md ring-2 ring-amber-400/30">
                                <AvatarImage src={getAvatarUrl(first.avatar)} />
                                <AvatarFallback>1</AvatarFallback>
                              </Avatar>
                              <span className="font-black text-xs truncate max-w-[85px]">{first.display_name}</span>
                              <span
                                className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold animate-result-reveal"
                                style={{ animationDelay: '820ms' }}
                              >
                                {first.score} pts
                              </span>
                            </div>
                            <div
                              className="w-full h-24 bg-amber-400 dark:bg-amber-600 rounded-t-xl flex items-center justify-center font-black text-2xl text-amber-950 dark:text-amber-100 mt-2 shadow-md animate-pedestal"
                              style={{ animationDelay: '650ms' }}
                            >
                              1
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-24 rounded-t-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground opacity-40">
                            -
                          </div>
                        )}
                      </div>

                      {/* 3rd Place */}
                      <div className="flex flex-col items-center flex-1">
                        {third ? (
                          <>
                            <div
                              className="animate-rise-up flex flex-col items-center"
                              style={{ animationDelay: '150ms' }}
                            >
                              <Avatar className="h-10 w-10 mb-1.5 border-2 border-amber-700/60 shadow-sm">
                                <AvatarImage src={getAvatarUrl(third.avatar)} />
                                <AvatarFallback>3</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-xs truncate max-w-[75px]">{third.display_name}</span>
                              <span
                                className="text-[10px] text-muted-foreground font-mono font-semibold animate-result-reveal"
                                style={{ animationDelay: '250ms' }}
                              >
                                {third.score} pts
                              </span>
                            </div>
                            <div
                              className="w-full h-12 bg-amber-700/80 dark:bg-amber-800 rounded-t-xl flex items-center justify-center font-black text-lg text-amber-100 mt-2 shadow-xs animate-pedestal"
                              style={{ animationDelay: '100ms' }}
                            >
                              3
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-12 rounded-t-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground opacity-40">
                            -
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Full Standings List Card */}
              <Card className="border shadow-md p-4">
                <div className="flex items-center justify-between pb-3 border-b mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <Trophy className="h-4 w-4 text-amber-500" /> Full Leaderboard
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {sorted.length} players
                  </Badge>
                </div>

                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {sorted.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground italic">
                      Leaderboard standings will appear shortly...
                    </div>
                  ) : (
                    sorted.map((item, idx) => {
                      const rank = idx + 1
                      const isMe = item.id === playerIdRef.current
                      const maxScore = Math.max(...sorted.map((p) => p.score), 100)
                      const scorePercent =
                        maxScore > 0
                          ? Math.min(100, Math.max(item.score > 0 ? 5 : 0, Math.round((item.score / maxScore) * 100)))
                          : 0
                      const barColor =
                        rank === 1
                          ? 'bg-amber-500'
                          : rank === 2
                          ? 'bg-slate-400'
                          : rank === 3
                          ? 'bg-amber-700'
                          : isMe
                          ? 'bg-primary'
                          : 'bg-primary/70'

                      return (
                        <div
                          key={item.id}
                          className={`animate-rise-up flex flex-col p-2.5 rounded-xl border transition-all text-xs space-y-2 ${
                            isMe
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/40 font-bold'
                              : 'border-border/60 bg-card hover:bg-muted/40'
                          }`}
                          style={{
                            animationDelay: `${idx * 60 + 200}ms`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {rank === 1 ? (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-black text-[10px] shadow-xs">
                                  1
                                </span>
                              ) : rank === 2 ? (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white font-black text-[10px] shadow-xs">
                                  2
                                </span>
                              ) : rank === 3 ? (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700 text-white font-black text-[10px] shadow-xs">
                                  3
                                </span>
                              ) : (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[10px] font-semibold">
                                  {rank}
                                </span>
                              )}
                              <Avatar className="h-7 w-7 border shrink-0">
                                <AvatarImage src={getAvatarUrl(item.avatar)} />
                                <AvatarFallback>{item.display_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-semibold truncate max-w-[140px] flex items-center gap-1">
                                {item.display_name}
                                {isMe && <span className="text-[10px] text-primary font-bold">(You)</span>}
                              </span>
                            </div>
                            <span
                              className="font-mono font-bold text-primary text-xs animate-result-reveal"
                              style={{
                                animationDelay: `${idx * 60 + 320}ms`,
                              }}
                            >
                              {item.score} <span className="text-[10px] text-muted-foreground font-normal">pts</span>
                            </span>
                          </div>
                          {/* Dynamic Leaderboard Progress Bar */}
                          <Progress
                            value={scorePercent}
                            indicatorClassName={barColor}
                            trackClassName="h-1.5 bg-muted/50"
                          />
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Back to Home CTA */}
                <div className="pt-4 mt-3 border-t">
                  <Button
                    onClick={() => {
                      localStorage.removeItem(`huddle_player_${roomCode}`)
                      window.location.href = '/'
                    }}
                    className="w-full gap-2 font-bold py-5 text-sm"
                  >
                    <Home className="h-4 w-4" /> Exit to Homepage
                  </Button>
                </div>
              </Card>
            </div>
          )
        })()}
      </main>

      {/* Footer / Anti-cheating footnote */}
      <footer className="text-center text-[10px] text-muted-foreground py-2 border-t max-w-lg mx-auto w-full">
        Huddle Live &bull; Powered by AI
      </footer>
    </div>
  )
}
