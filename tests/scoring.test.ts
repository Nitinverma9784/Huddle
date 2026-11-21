import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateScore } from '../lib/scoring'

describe('Scoring Logic', () => {
  it('returns 0 points and 0 bonus if answer is incorrect', () => {
    const result = calculateScore({
      isCorrect: false,
      basePoints: 1000,
      timerSeconds: 20,
      responseTimeMs: 2500,
    })
    assert.equal(result.isCorrect, false)
    assert.equal(result.pointsAwarded, 0)
    assert.equal(result.speedBonus, 0)
  })

  it('awards maximum points for an instant (0ms) correct answer', () => {
    const result = calculateScore({
      isCorrect: true,
      basePoints: 1000,
      timerSeconds: 20,
      responseTimeMs: 0,
    })
    assert.equal(result.isCorrect, true)
    assert.equal(result.pointsAwarded, 1000)
    assert.equal(result.speedBonus, 500)
  })

  it('awards minimum (50% base) points when answering at the deadline', () => {
    const result = calculateScore({
      isCorrect: true,
      basePoints: 1000,
      timerSeconds: 20,
      responseTimeMs: 20000,
    })
    assert.equal(result.isCorrect, true)
    assert.equal(result.pointsAwarded, 500)
    assert.equal(result.speedBonus, 0)
  })

  it('awards proportional points for mid-time response', () => {
    const result = calculateScore({
      isCorrect: true,
      basePoints: 1000,
      timerSeconds: 20,
      responseTimeMs: 10000, // half-time
    })
    assert.equal(result.isCorrect, true)
    assert.equal(result.pointsAwarded, 750)
    assert.equal(result.speedBonus, 250)
  })
})
