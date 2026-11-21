import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmailViaEmailJS } from '../lib/email/emailjs'
import { generateIcsCalendar } from '../lib/email/ics'

describe('EmailJS & Edge Email Service', () => {
  test('gracefully skips sending when EmailJS keys are not set', async () => {
    const origService = process.env.EMAILJS_SERVICE_ID
    const origTemplate = process.env.EMAILJS_TEMPLATE_ID
    const origKey = process.env.EMAILJS_PUBLIC_KEY
    delete process.env.EMAILJS_SERVICE_ID
    delete process.env.EMAILJS_TEMPLATE_ID
    delete process.env.EMAILJS_PUBLIC_KEY

    try {
      const res = await sendEmailViaEmailJS({
        to: 'student@example.com',
        subject: 'Quiz Invitation',
        quizTitle: 'Live Quiz',
      })

      assert.equal(res.success, false)
      assert.equal(res.skipped, true)
      assert.equal(res.error, 'EmailJS environment variables not configured')
    } finally {
      if (origService) process.env.EMAILJS_SERVICE_ID = origService
      if (origTemplate) process.env.EMAILJS_TEMPLATE_ID = origTemplate
      if (origKey) process.env.EMAILJS_PUBLIC_KEY = origKey
    }
  })

  test('rejects delivery if recipient list is empty or invalid', async () => {
    process.env.EMAILJS_SERVICE_ID = 'service_test'
    process.env.EMAILJS_TEMPLATE_ID = 'template_test'
    process.env.EMAILJS_PUBLIC_KEY = 'user_test_key'

    try {
      const res = await sendEmailViaEmailJS({
        to: ['', 'not-an-email'],
        subject: 'Quiz Invitation',
      })

      assert.equal(res.success, false)
      assert.equal(res.error, 'No valid recipient email addresses provided')
    } finally {
      delete process.env.EMAILJS_SERVICE_ID
      delete process.env.EMAILJS_TEMPLATE_ID
      delete process.env.EMAILJS_PUBLIC_KEY
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
