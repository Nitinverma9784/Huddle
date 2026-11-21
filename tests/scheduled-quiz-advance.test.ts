import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Scheduled Quiz Edge Advancement & Autonomous Life-cycle', () => {
  test('scheduled start condition triggers when scheduled_at arrives or is past', () => {
    const scheduledPast = new Date(Date.now() - 10000).toISOString()
    const scheduledFuture = new Date(Date.now() + 600000).toISOString()
    const scheduledNearLeeway = new Date(Date.now() + 2000).toISOString() // within 5s grace buffer

    const isDue = (scheduledAt: string) => {
      const scheduledTime = new Date(scheduledAt).getTime()
      return Date.now() >= scheduledTime - 5000
    }

    assert.equal(isDue(scheduledPast), true)
    assert.equal(isDue(scheduledNearLeeway), true)
    assert.equal(isDue(scheduledFuture), false)
  })

  test('auto-advancing questions increments current index and sets live status', () => {
    const totalQuestions = 3
    const currentIndex = 0

    const advanceQuestion = (currentIdx: number, total: number) => {
      const nextIndex = currentIdx + 1
      if (nextIndex < total) {
        return {
          status: 'live',
          current_question_index: nextIndex,
          isEnd: false,
        }
      }
      return {
        status: 'ended',
        isEnd: true,
      }
    }

    // Advance 0 -> 1
    const step1 = advanceQuestion(currentIndex, totalQuestions)
    assert.equal(step1.status, 'live')
    assert.equal(step1.current_question_index, 1)
    assert.equal(step1.isEnd, false)

    // Advance 1 -> 2
    const step2 = advanceQuestion(1, totalQuestions)
    assert.equal(step2.status, 'live')
    assert.equal(step2.current_question_index, 2)
    assert.equal(step2.isEnd, false)

    // Advance 2 -> End
    const step3 = advanceQuestion(2, totalQuestions)
    assert.equal(step3.status, 'ended')
    assert.equal(step3.isEnd, true)
  })

  test('formats scheduled countdown ticker correctly', () => {
    const formatCountdown = (diffMs: number) => {
      if (diffMs <= 0) return 'Starting now...'
      const totalSecs = Math.floor(diffMs / 1000)
      const hours = Math.floor(totalSecs / 3600)
      const mins = Math.floor((totalSecs % 3600) / 60)
      const secs = totalSecs % 60
      if (hours > 0) return `${hours}h ${mins}m ${secs}s`
      if (mins > 0) return `${mins}m ${secs}s`
      return `${secs}s`
    }

    assert.equal(formatCountdown(-100), 'Starting now...')
    assert.equal(formatCountdown(45000), '45s')
    assert.equal(formatCountdown(125000), '2m 5s')
    assert.equal(formatCountdown(3665000), '1h 1m 5s')
  })
})
