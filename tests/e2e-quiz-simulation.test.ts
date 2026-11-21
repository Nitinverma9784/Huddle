import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateRoomCode, isValidRoomCode } from '../lib/room-code'
import { calculateScore, calculateRemainingSeconds } from '../lib/scoring'
import { extractTextFromBuffer } from '../lib/file-parser'
import { generateQuizWithFallback } from '../lib/ai/fallback'
import {
  QuizSchema,
  QuestionSchema,
  PlayerJoinSchema,
  SubmitAnswerSchema,
} from '../lib/validations/quiz'

interface SimulatedPlayer {
  id: string
  name: string
  avatar: string
  token: string
  score: number
}

interface SimulatedAnswer {
  playerId: string
  questionIndex: number
  selectedIndex: number
  isCorrect: boolean
  responseTimeMs: number
  pointsAwarded: number
  speedBonus: number
}

describe('Full End-to-End Quiz Simulation (3-4 Players)', () => {
  it('runs complete lifecycle of a live multiplayer quiz session', async () => {
    // =========================================================================
    // STEP 1: Host creates a room code & quiz with 3 questions
    // =========================================================================
    const roomCode = generateRoomCode()
    assert.equal(isValidRoomCode(roomCode), true, 'Room code should be valid')

    const rawQuiz = {
      title: 'Global Trivia Huddle',
      description: 'Test your general knowledge across science, tech, and geography',
      source_type: 'prompt' as const,
      theme: 'default' as const,
      default_timer_seconds: 20,
      default_points: 1000,
      questions: [
        {
          text: 'What is the capital of Japan?',
          options: ['Kyoto', 'Tokyo', 'Osaka', 'Nagoya'],
          correct_index: 1,
          timer_seconds: 20,
          points: 1000,
          order_index: 0,
        },
        {
          text: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
          correct_index: 2,
          timer_seconds: 15,
          points: 1000,
          order_index: 1,
        },
        {
          text: 'What is 2^10?',
          options: ['512', '1024', '2048', '4096'],
          correct_index: 1,
          timer_seconds: 10,
          points: 1200,
          order_index: 2,
        },
      ],
    }

    const validatedQuiz = QuizSchema.parse(rawQuiz)
    assert.equal(validatedQuiz.questions?.length, 3)

    // =========================================================================
    // STEP 2: 4 Players join the lobby
    // =========================================================================
    const players: SimulatedPlayer[] = []
    const playerInputs = [
      { name: 'Alice', avatar: '1' },
      { name: 'Bob', avatar: '2' },
      { name: 'Charlie', avatar: '3' },
      { name: 'Diana', avatar: '4' },
    ]

    for (let i = 0; i < playerInputs.length; i++) {
      const input = PlayerJoinSchema.parse({
        room_code: roomCode,
        display_name: playerInputs[i].name,
        avatar: playerInputs[i].avatar,
      })
      players.push({
        id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        name: input.display_name,
        avatar: input.avatar,
        token: `token-secret-${i + 1}`,
        score: 0,
      })
    }

    assert.equal(players.length, 4, '4 players should be joined in lobby')

    // Session state tracking
    let sessionStatus = 'lobby'
    let currentQuestionIndex = 0
    const answersLog: SimulatedAnswer[] = []

    // =========================================================================
    // STEP 3: Host starts the game -> Question 1 (Capital of Japan)
    // =========================================================================
    sessionStatus = 'live'
    currentQuestionIndex = 0
    const q1 = validatedQuiz.questions![0]
    const q1StartedAtIso = new Date().toISOString()

    // Test timer calculations
    const remainingTimeQ1 = calculateRemainingSeconds(q1StartedAtIso, q1.timer_seconds)
    assert.ok(remainingTimeQ1 <= 20 && remainingTimeQ1 >= 19)

    // Simulate 4 players answering Question 1
    // Alice answers correctly & super fast (1500ms)
    // Bob answers correctly at medium speed (8000ms)
    // Charlie answers incorrectly (3000ms)
    // Diana answers correctly slowly (18000ms)
    const q1PlayerSubmissions = [
      { player: players[0], selectedIndex: 1, responseTimeMs: 1500 }, // Correct (Tokyo)
      { player: players[1], selectedIndex: 1, responseTimeMs: 8000 }, // Correct (Tokyo)
      { player: players[2], selectedIndex: 0, responseTimeMs: 3000 }, // Incorrect (Kyoto)
      { player: players[3], selectedIndex: 1, responseTimeMs: 18000 }, // Correct (Tokyo)
    ]

    for (const sub of q1PlayerSubmissions) {
      // Validate schema
      SubmitAnswerSchema.parse({
        session_id: '123e4567-e89b-12d3-a456-426614174099',
        player_id: sub.player.id,
        player_token: sub.player.token,
        question_id: '123e4567-e89b-12d3-a456-426614174088',
        selected_index: sub.selectedIndex,
      })

      const isCorrect = sub.selectedIndex === q1.correct_index
      const scoreRes = calculateScore({
        isCorrect,
        basePoints: q1.points,
        timerSeconds: q1.timer_seconds,
        responseTimeMs: sub.responseTimeMs,
      })

      sub.player.score += scoreRes.pointsAwarded
      answersLog.push({
        playerId: sub.player.id,
        questionIndex: 0,
        selectedIndex: sub.selectedIndex,
        isCorrect,
        responseTimeMs: sub.responseTimeMs,
        pointsAwarded: scoreRes.pointsAwarded,
        speedBonus: scoreRes.speedBonus,
      })
    }

    // Verify Q1 score order: Alice (fast) > Bob (medium) > Diana (slow)
    assert.ok(players[0].score > players[1].score, 'Fast correct > Medium correct')
    assert.ok(players[1].score > players[3].score, 'Medium correct > Slow correct')
    assert.equal(players[2].score, 0, 'Wrong answer gets 0 points')

    // Host ends Question 1
    sessionStatus = 'question_ended'
    assert.equal(sessionStatus, 'question_ended')

    // =========================================================================
    // STEP 4: Host shows Leaderboard after Question 1
    // =========================================================================
    sessionStatus = 'leaderboard'
    const leaderboardQ1 = [...players].sort((a, b) => b.score - a.score)
    assert.equal(leaderboardQ1[0].name, 'Alice', 'Alice should be 1st place after Q1')
    assert.equal(leaderboardQ1[3].name, 'Charlie', 'Charlie should be 4th place after Q1')

    // =========================================================================
    // STEP 5: Question 2 (Red Planet) - 15s timer
    // =========================================================================
    sessionStatus = 'live'
    currentQuestionIndex = 1
    const q2 = validatedQuiz.questions![1]

    // Alice answers correctly (4000ms)
    // Bob answers correctly (2000ms) - faster than Alice this round!
    // Charlie answers correctly (1000ms) - comeback!
    // Diana answers incorrectly (5000ms)
    const q2PlayerSubmissions = [
      { player: players[0], selectedIndex: 2, responseTimeMs: 4000 }, // Correct (Mars)
      { player: players[1], selectedIndex: 2, responseTimeMs: 2000 }, // Correct (Mars)
      { player: players[2], selectedIndex: 2, responseTimeMs: 1000 }, // Correct (Mars)
      { player: players[3], selectedIndex: 0, responseTimeMs: 5000 }, // Incorrect (Venus)
    ]

    for (const sub of q2PlayerSubmissions) {
      const isCorrect = sub.selectedIndex === q2.correct_index
      const scoreRes = calculateScore({
        isCorrect,
 basePoints: q2.points,
        timerSeconds: q2.timer_seconds,
        responseTimeMs: sub.responseTimeMs,
      })
      sub.player.score += scoreRes.pointsAwarded
    }

    // =========================================================================
    // STEP 6: Question 3 (2^10) - 10s timer (1200 base points)
    // =========================================================================
    sessionStatus = 'live'
    currentQuestionIndex = 2
    const q3 = validatedQuiz.questions![2]

    // All players answer Question 3
    const q3PlayerSubmissions = [
      { player: players[0], selectedIndex: 1, responseTimeMs: 2000 }, // Correct (1024)
      { player: players[1], selectedIndex: 1, responseTimeMs: 1500 }, // Correct (1024)
      { player: players[2], selectedIndex: 1, responseTimeMs: 1000 }, // Correct (1024)
      { player: players[3], selectedIndex: 1, responseTimeMs: 3000 }, // Correct (1024)
    ]

    for (const sub of q3PlayerSubmissions) {
      const isCorrect = sub.selectedIndex === q3.correct_index
      const scoreRes = calculateScore({
        isCorrect,
        basePoints: q3.points,
        timerSeconds: q3.timer_seconds,
        responseTimeMs: sub.responseTimeMs,
      })
      sub.player.score += scoreRes.pointsAwarded
    }

    // =========================================================================
    // STEP 7: Game Ends -> Final Podium & Leaderboard Standings
    // =========================================================================
    sessionStatus = 'ended'
    const finalLeaderboard = [...players].sort((a, b) => b.score - a.score)

    assert.equal(sessionStatus, 'ended')
    assert.equal(finalLeaderboard.length, 4)
    assert.ok(finalLeaderboard[0].score > 0, 'Winner score > 0')
    assert.ok(
      finalLeaderboard[0].score >= finalLeaderboard[1].score,
      '1st place score >= 2nd place score'
    )
    assert.ok(
      finalLeaderboard[1].score >= finalLeaderboard[2].score,
      '2nd place score >= 3rd place score'
    )
    assert.ok(
      finalLeaderboard[2].score >= finalLeaderboard[3].score,
      '3rd place score >= 4th place score'
    )
  })

  it('handles edge case: answer submission after time expiration', () => {
    const expiredResult = calculateScore({
      isCorrect: true,
      basePoints: 1000,
      timerSeconds: 10,
      responseTimeMs: 12000, // 12s on a 10s question
    })

    // At deadline (or beyond), multiplier clamps to 0.5 (50% base points)
    assert.equal(expiredResult.pointsAwarded, 500)
    assert.equal(expiredResult.speedBonus, 0)
  })

  it('tests document parsing for AI quiz creation', async () => {
    const sampleTxt = Buffer.from(
      'Huddle is an AI-powered live multiplayer quiz platform built with Next.js, Supabase, and Tailwind CSS.'
    )
    const doc = await extractTextFromBuffer(sampleTxt, 'text/plain', 'notes.txt')
    assert.ok(doc.text.includes('Huddle'))
    assert.equal(doc.wordCount, 15)
  })

  it('tests AI quiz generation with prompt options', async () => {
    const res = await generateQuizWithFallback({
      topic: 'Science',
      question_count: 3,
      difficulty: 'easy',
      question_type: 'mcq',
    })

    assert.ok(res.provider)
    assert.ok(res.result.questions.length > 0)
    assert.ok(res.result.questions[0].text)
  })
})
