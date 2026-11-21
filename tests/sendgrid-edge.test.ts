import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmailViaSendgrid } from '../lib/email/sendgrid'
import { generateIcsCalendar } from '../lib/email/ics'

describe('SendGrid & Edge Email Service', () => {
  test('gracefully skips sending when SENDGRID_API_KEY is not set', async () => {
    const originalKey = process.env.SENDGRID_API_KEY
    delete process.env.SENDGRID_API_KEY

    try {
      const res = await sendEmailViaSendgrid({
        to: 'student@example.com',
        subject: 'Quiz Invitation',
        html: '<p>Join my quiz</p>',
      })

      assert.equal(res.success, false)
      assert.equal(res.skipped, true)
      assert.equal(res.error, 'SENDGRID_API_KEY not configured')
    } finally {
      if (originalKey) process.env.SENDGRID_API_KEY = originalKey
    }
  })

  test('rejects delivery if recipient list is empty or invalid', async () => {
    process.env.SENDGRID_API_KEY = 'SG.mock_test_key'
    try {
      const res = await sendEmailViaSendgrid({
        to: ['', 'not-an-email'],
        subject: 'Quiz Invitation',
        html: '<p>Join my quiz</p>',
      })

      assert.equal(res.success, false)
      assert.equal(res.error, 'No valid recipient email addresses provided')
    } finally {
      delete process.env.SENDGRID_API_KEY
    }
  })

  test('generates valid ICS calendar attachment for scheduled sessions', async () => {
    const icsContent = await generateIcsCalendar({
      title: 'Biology 101 Midterm Quiz',
      description: 'Multiplayer quiz on Huddle',
      startIso: '2026-11-28T14:30:00Z',
      url: 'https://huddle.live/room/ABC123',
      organizerName: 'Professor Smith',
    })

    assert.ok(icsContent.includes('BEGIN:VCALENDAR'))
    assert.ok(icsContent.includes('VERSION:2.0'))
    assert.ok(icsContent.includes('Biology 101 Midterm Quiz'))
    assert.ok(icsContent.includes('https://huddle.live/room/ABC123'))
    assert.ok(icsContent.includes('END:VCALENDAR'))
  })
})
