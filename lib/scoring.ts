/**
 * Calculates score for an answer based on correctness, speed bonus, and question base points.
 * Server-authoritative logic.
 */
export interface ScoreCalculationParams {
  isCorrect: boolean
  basePoints: number
  timerSeconds: number
  responseTimeMs: number
}

export interface ScoreCalculationResult {
  isCorrect: boolean
  pointsAwarded: number
  speedBonus: number
}

export function calculateScore({
  isCorrect,
  basePoints,
  timerSeconds,
  responseTimeMs,
}: ScoreCalculationParams): ScoreCalculationResult {
  if (!isCorrect) {
    return {
      isCorrect: false,
      pointsAwarded: 0,
      speedBonus: 0,
    }
  }

  const maxDurationMs = timerSeconds * 1000
  const clampedResponseTimeMs = Math.max(0, Math.min(responseTimeMs, maxDurationMs))

  // Speed factor: 1.0 if answered instantly (0ms), decreasing to 0.5 at the deadline
  // Formula: points = basePoints * (0.5 + 0.5 * (1 - responseTime / maxDuration))
  const timeRatio = clampedResponseTimeMs / maxDurationMs
  const speedMultiplier = 0.5 + 0.5 * (1 - timeRatio)

  const pointsAwarded = Math.round(basePoints * speedMultiplier)
  const speedBonus = pointsAwarded - Math.round(basePoints * 0.5)

  return {
    isCorrect: true,
    pointsAwarded,
    speedBonus: Math.max(0, speedBonus),
  }
}

/**
 * Server-authoritative remaining time calculation.
 */
export function calculateRemainingSeconds(
  questionStartedAtIso: string | null | undefined,
  timerSeconds: number,
  serverNowMs: number = Date.now()
): number {
  if (!questionStartedAtIso) {
    return timerSeconds
  }

  const startedMs = new Date(questionStartedAtIso).getTime()
  const elapsedSeconds = Math.max(0, Math.floor((serverNowMs - startedMs) / 1000))
  const remaining = timerSeconds - elapsedSeconds

  return Math.max(0, remaining)
}
