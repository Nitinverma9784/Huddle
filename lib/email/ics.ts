import { createEvent, EventAttributes } from 'ics'

export interface CalendarEventDetails {
  title: string
  description: string
  startIso: string // e.g. "2026-11-25T15:00:00Z"
  durationMinutes?: number
  url: string
  organizerName?: string
  organizerEmail?: string
}

export function generateIcsCalendar(details: CalendarEventDetails): Promise<string> {
  return new Promise((resolve, reject) => {
    const startDate = new Date(details.startIso)
    const duration = details.durationMinutes || 30

    const event: EventAttributes = {
      title: `Huddle: ${details.title}`,
      description: `${details.description}\n\nJoin the live quiz here: ${details.url}`,
      url: details.url,
      start: [
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + 1,
        startDate.getUTCDate(),
        startDate.getUTCHours(),
        startDate.getUTCMinutes(),
      ],
      duration: { minutes: duration },
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: {
        name: details.organizerName || 'Huddle Host',
        email: details.organizerEmail || 'no-reply@huddle.live',
      },
      productId: 'huddle/ics',
    }

    createEvent(event, (error, value) => {
      if (error) {
        reject(error)
      } else {
        resolve(value)
      }
    })
  })
}
