'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import confetti from 'canvas-confetti'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/avatar'
import {
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  Crown,
  Medal,
  Copy,
  Check,
  Mail,
  Share2,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface PresenterQuestion {
  id?: string
  text: string
  options: string[]
  timer_seconds?: number
  points?: number
  image_url?: string
  correct_index?: number
}

export interface PresenterPlayer {
  id: string
  display_name: string
  avatar: string
  score: number
}

interface PresenterViewProps {
  roomCode: string
  status: string
  quizTitle: string
  currentQuestion: PresenterQuestion | null
  questionIndex: number
  totalQuestions: number
  remainingSeconds: number
  players: PresenterPlayer[]
  answersCount: number
  answerDistribution?: { [key: number]: number }
  joinUrl: string
  countdownSeconds?: number
  autoAdvanceSeconds?: number | null
  scheduledAt?: string | null
}

export function PresenterView({
  roomCode,
  status,
  quizTitle,
  currentQuestion,
  questionIndex,
  totalQuestions,
  remainingSeconds,
  players,
  answersCount,
  answerDistribution = {},
  joinUrl,
  countdownSeconds = 5,
  autoAdvanceSeconds = null,
  scheduledAt = null,
}: PresenterViewProps) {
  const confettiTriggered = useRef(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [scheduledCountdown, setScheduledCountdown] = useState<string>('')

  // Live countdown ticker for scheduled sessions
  useEffect(() => {
    if (!scheduledAt || (status !== 'lobby' && status !== 'scheduled')) return

    const updateScheduledTicker = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now()
      if (diff <= 0) {
        setScheduledCountdown('Starting now...')
      } else {
        const totalSecs = Math.floor(diff / 1000)
        const hours = Math.floor(totalSecs / 3600)
        const mins = Math.floor((totalSecs % 3600) / 60)
        const secs = totalSecs % 60
        if (hours > 0) {
          setScheduledCountdown(`${hours}h ${mins}m ${secs}s`)
        } else if (mins > 0) {
          setScheduledCountdown(`${mins}m ${secs}s`)
        } else {
          setScheduledCountdown(`${secs}s`)
        }
      }
    }

    updateScheduledTicker()
    const timer = setInterval(updateScheduledTicker, 1000)
    return () => clearInterval(timer)
  }, [scheduledAt, status])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopiedLink(true)
      toast.success('Join link copied to clipboard!')
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const shareText = `Join my live quiz "${quizTitle}" on Huddle! 🚀\n\nRoom Code: ${roomCode}\nDirect Link: ${joinUrl}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const mailSubject = `Join live quiz: ${quizTitle}`
  const mailBody = `Hi,\n\nYou're invited to join my live multiplayer quiz "${quizTitle}" on Huddle!\n\nRoom Code: ${roomCode}\nJoin Link: ${joinUrl}\n\nJoin with your phone or browser to participate live.\n\nSee you there!`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  // Fire confetti on podium
  useEffect(() => {
    if ((status === 'podium' || status === 'ended') && !confettiTriggered.current) {
      confettiTriggered.current = true
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      })
    }
  }, [status])

  const topPlayers = [...players].sort((a, b) => b.score - a.score)
  const optionColors = [
    'bg-red-500 text-white',
    'bg-blue-500 text-white',
    'bg-amber-500 text-white',
    'bg-emerald-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
  ]

  return (
    <div className="flex flex-col min-h-[80vh] justify-between p-6 max-w-6xl mx-auto">
      {/* 1. LOBBY VIEW */}
      {(status === 'lobby' || status === 'scheduled') && (
        <div className="flex flex-col items-center justify-center space-y-8 my-auto text-center">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
                Live Multiplayer Room
              </Badge>
              {(status === 'scheduled' || scheduledAt) && (
                <Badge variant="secondary" className="px-3 py-1 text-xs font-bold gap-1.5 bg-primary/10 text-primary border-primary/30">
                  <Clock className="h-3.5 w-3.5" />
                  {scheduledCountdown ? `Starts in ${scheduledCountdown}` : 'Scheduled Quiz'}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{quizTitle}</h1>
            <p className="text-lg text-muted-foreground">
              {scheduledAt
                ? `Scheduled for ${new Date(scheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Quiz starts automatically!`
                : 'Join with your phone or browser. No sign-in required!'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 bg-card border shadow-lg rounded-3xl p-6 sm:p-8 max-w-xl w-full">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-sm border shrink-0">
                <QRCodeSVG value={joinUrl} size={175} />
              </div>
              <div className="flex flex-col items-center sm:items-start space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Join at <span className="text-foreground underline break-all">{joinUrl.replace(/^https?:\/\//, '')}</span>
                </div>
                <div className="text-xs text-muted-foreground">or enter room code:</div>
                <div className="font-mono text-5xl font-black tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
                  {roomCode}
                </div>
              </div>
            </div>

            {/* Quick Share Action Bar */}
            <div className="w-full pt-5 border-t border-border/60 flex flex-wrap items-center justify-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 rounded-xl text-xs font-semibold h-9 px-4 hover:bg-muted transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-2 rounded-xl text-xs font-semibold h-9 px-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 transition-colors cursor-pointer'
                )}
              >
                <WhatsAppIcon className="h-4 w-4 fill-current" />
                <span>WhatsApp</span>
              </a>

              <a
                href={mailtoUrl}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-2 rounded-xl text-xs font-semibold h-9 px-4 hover:bg-muted transition-colors cursor-pointer'
                )}
              >
                <Mail className="h-4 w-4 text-primary" />
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Connected Players in Lobby */}
          <div className="w-full max-w-4xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Joined Players ({players.length})</span>
            </div>
            {players.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-6">
                Waiting for players to join... Scan the QR code above!
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={getAvatarUrl(p.avatar || p.display_name)} />
                      <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm">{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1.5. GET READY COUNTDOWN VIEW */}
      {status === 'countdown' && (
        <div className="flex flex-col items-center justify-center space-y-8 my-auto text-center animate-in fade-in zoom-in-90 duration-300">
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-primary border-primary/40 bg-primary/10">
            Get Ready
          </Badge>
          <div className="space-y-3">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight">Question 1 Starting In</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Answer fast on your phone or browser to earn speed bonus points!
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full bg-primary/10 border-4 border-primary text-primary font-mono text-7xl sm:text-8xl font-black animate-pulse shadow-2xl shadow-primary/30">
              {countdownSeconds}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{players.length} {players.length === 1 ? 'player' : 'players'} ready</span>
          </div>
        </div>
      )}

      {/* 2. QUESTION ACTIVE VIEW */}
      {status === 'live' && currentQuestion && (
        <div className="flex flex-col space-y-6 my-auto">
          {/* Top Bar: Question Count & Countdown Timer */}
          <div className="flex items-center justify-between border-b pb-4">
            <Badge variant="secondary" className="text-base px-3 py-1 font-bold">
              Question {questionIndex + 1} of {totalQuestions}
            </Badge>

            {/* Circular Timer Display */}
            <div className="flex items-center gap-3">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-2xl font-black border-4 transition-colors ${
                  remainingSeconds <= 5
                    ? 'border-destructive text-destructive animate-pulse'
                    : 'border-primary text-primary'
                }`}
              >
                {remainingSeconds}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-muted-foreground">Answers</span>
                <span className="font-bold text-sm">
                  {answersCount} / {players.length}
                </span>
              </div>
            </div>
          </div>

          {/* Big Question Prompt */}
          <div className="py-8 text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
              {currentQuestion.text}
            </h2>
            {currentQuestion.image_url && (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden shadow-md max-h-60">
                <img
                  src={currentQuestion.image_url}
                  alt="Question illustration"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Options Grid (Presenter shows option texts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {currentQuestion.options.map((opt: string, idx: number) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl text-xl font-bold flex items-center gap-4 shadow-md ${
                  optionColors[idx % optionColors.length]
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 font-mono text-lg">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-tight">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. QUESTION ENDED VIEW (Distribution + Correct Answer) */}
      {status === 'question_ended' && currentQuestion && (
        <div className="flex flex-col space-y-6 my-auto text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm px-4 py-1">
              Time&apos;s Up! Question {questionIndex + 1} Review
            </Badge>
            {autoAdvanceSeconds !== null && (
              <Badge className="text-xs px-3 py-1 bg-primary text-primary-foreground gap-1">
                <Clock className="h-3 w-3" /> Auto-advancing in {autoAdvanceSeconds}s
              </Badge>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">{currentQuestion.text}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full pt-4">
            {currentQuestion.options.map((opt: string, idx: number) => {
              const isCorrect = currentQuestion.correct_index === idx
              const count = answerDistribution[idx] || 0
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl flex items-center justify-between border-2 transition-all shadow-md ${
                    isCorrect
                      ? 'border-green-500 bg-green-500/10 text-foreground ring-4 ring-green-500/30'
                      : 'border-muted bg-card/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                        optionColors[idx % optionColors.length]
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-semibold text-lg">{opt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {count} votes
                    </Badge>
                    {isCorrect && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. LEADERBOARD VIEW */}
      {status === 'leaderboard' && (
        <div className="flex flex-col space-y-6 my-auto max-w-2xl mx-auto w-full">
          <div className="text-center space-y-2">
            <Trophy className="h-10 w-10 mx-auto text-amber-500 animate-bounce" />
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-3xl font-black tracking-tight">Leaderboard</h2>
              {autoAdvanceSeconds !== null && (
                <Badge className="text-xs px-3 py-1 bg-primary text-primary-foreground gap-1">
                  <Clock className="h-3 w-3" />
                  {questionIndex + 1 < totalQuestions
                    ? `Next Question in ${autoAdvanceSeconds}s`
                    : `Podium in ${autoAdvanceSeconds}s`}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Top players after Question {questionIndex + 1}</p>
          </div>

          <div className="space-y-3 pt-2">
            {(() => {
              const maxScore = Math.max(...topPlayers.map((p) => p.score), 100)

              return topPlayers.slice(0, 5).map((player, idx) => {
                const scorePercent =
                  maxScore > 0
                    ? Math.min(100, Math.max(player.score > 0 ? 5 : 0, Math.round((player.score / maxScore) * 100)))
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
                    key={player.id}
                    className="animate-rise-up flex flex-col p-4 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all space-y-2.5"
                    style={{
                      animationDelay: `${(topPlayers.slice(0, 5).length - 1 - idx) * 160 + 100}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl font-mono font-bold text-base bg-muted">
                          {idx === 0 && <Crown className="h-5 w-5 text-amber-500 animate-bounce" />}
                          {idx === 1 && <Medal className="h-5 w-5 text-slate-400" />}
                          {idx === 2 && <Medal className="h-5 w-5 text-amber-700" />}
                          {idx > 2 && idx + 1}
                        </div>
                        <Avatar className="h-10 w-10 border shadow-xs">
                          <AvatarImage src={getAvatarUrl(player.avatar || player.display_name)} />
                          <AvatarFallback>{player.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-lg">{player.display_name}</span>
                      </div>
                      <div className="font-mono text-xl font-black text-primary animate-result-reveal" style={{ animationDelay: `${(topPlayers.slice(0, 5).length - 1 - idx) * 160 + 260}ms` }}>
                        {player.score.toLocaleString()} pts
                      </div>
                    </div>

                    {/* Dynamic Leaderboard Progress Bar */}
                    <div className="pt-0.5">
                      <Progress
                        value={scorePercent}
                        indicatorClassName={barColor}
                        trackClassName="h-2 bg-muted/60"
                      />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* 5. PODIUM / ENDED VIEW */}
      {(status === 'podium' || status === 'ended') && (
        <div className="flex flex-col items-center justify-center space-y-8 my-auto text-center">
          <div className="space-y-3">
            <img
              src="/huddle-logo.png"
              alt="Huddle"
              className="h-16 w-auto mx-auto object-contain select-none animate-pulse"
            />
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight animate-result-reveal">Final Podium!</h1>
            <p className="text-sm text-muted-foreground animate-result-reveal" style={{ animationDelay: '150ms' }}>
              Congratulations to all participants!
            </p>
          </div>

          {/* 3-Step Podium (Staggered Rising Pedestals) */}
          <div className="flex items-end justify-center gap-4 pt-8 w-full max-w-lg">
            {/* 2nd Place */}
            {topPlayers[1] && (
              <div className="flex flex-col items-center flex-1">
                <div className="animate-rise-up flex flex-col items-center" style={{ animationDelay: '400ms' }}>
                  <Avatar className="h-16 w-16 mb-2 border-4 border-slate-300 shadow-md">
                    <AvatarImage src={getAvatarUrl(topPlayers[1].avatar)} />
                    <AvatarFallback>2</AvatarFallback>
                  </Avatar>
                  <div className="font-bold text-sm truncate max-w-[100px]">{topPlayers[1].display_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{topPlayers[1].score} pts</div>
                </div>
                <div
                  className="w-full h-32 bg-slate-300 dark:bg-slate-700 rounded-t-2xl flex items-center justify-center font-black text-3xl text-slate-600 dark:text-slate-300 mt-3 shadow-md animate-pedestal"
                  style={{ animationDelay: '350ms' }}
                >
                  2
                </div>
              </div>
            )}

            {/* 1st Place (Gold / Champion) */}
            {topPlayers[0] && (
              <div className="flex flex-col items-center flex-1">
                <div className="animate-rise-up flex flex-col items-center" style={{ animationDelay: '700ms' }}>
                  <Crown className="h-8 w-8 text-amber-500 mb-1 animate-bounce" />
                  <Avatar className="h-20 w-20 mb-2 border-4 border-amber-400 shadow-xl ring-4 ring-amber-400/30">
                    <AvatarImage src={getAvatarUrl(topPlayers[0].avatar)} />
                    <AvatarFallback>1</AvatarFallback>
                  </Avatar>
                  <div className="font-black text-base truncate max-w-[120px]">{topPlayers[0].display_name}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {topPlayers[0].score} pts
                  </div>
                </div>
                <div
                  className="w-full h-44 bg-amber-400 dark:bg-amber-600 rounded-t-2xl flex items-center justify-center font-black text-4xl text-amber-950 dark:text-amber-100 mt-3 shadow-xl animate-pedestal"
                  style={{ animationDelay: '650ms' }}
                >
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topPlayers[2] && (
              <div className="flex flex-col items-center flex-1">
                <div className="animate-rise-up flex flex-col items-center" style={{ animationDelay: '150ms' }}>
                  <Avatar className="h-14 w-14 mb-2 border-4 border-amber-700 shadow-md">
                    <AvatarImage src={getAvatarUrl(topPlayers[2].avatar)} />
                    <AvatarFallback>3</AvatarFallback>
                  </Avatar>
                  <div className="font-bold text-sm truncate max-w-[100px]">{topPlayers[2].display_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{topPlayers[2].score} pts</div>
                </div>
                <div
                  className="w-full h-24 bg-amber-700/80 rounded-t-2xl flex items-center justify-center font-black text-2xl text-amber-100 mt-3 shadow-md animate-pedestal"
                  style={{ animationDelay: '100ms' }}
                >
                  3
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
