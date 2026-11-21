import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateRemainingSeconds } from '../lib/scoring'

describe('Timer Calculation', () => {
  it('returns default timer if question has not started', () => {
    const remaining = calculateRemainingSeconds(null, 30)
    assert.equal(remaining, 30)
  })

  it('computes exact remaining seconds based on server start time', () => {
    const startedAt = new Date('2026-11-20T12:00:00Z').toISOString()
    const serverNow = new Date('2026-11-20T12:00:10Z').getTime() // 10s elapsed
    const remaining = calculateRemainingSeconds(startedAt, 30, serverNow)
    assert.equal(remaining, 20)
  })

  it('clamps remaining seconds to 0 when time expired', () => {
    const startedAt = new Date('2026-11-20T12:00:00Z').toISOString()
    const serverNow = new Date('2026-11-20T12:00:35Z').getTime() // 35s elapsed on 30s timer
    const remaining = calculateRemainingSeconds(startedAt, 30, serverNow)
    assert.equal(remaining, 0)
  })
})
