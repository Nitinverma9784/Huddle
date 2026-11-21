/**
 * SendGrid Email Delivery Service
 * Built with standard fetch to run seamlessly on both Node.js and Vercel Edge Runtime.
 */

export interface SendGridAttachment {
  content: string // Base64 encoded string
  filename: string
  type: string
  disposition?: 'attachment' | 'inline'
}

export interface SendGridEmailOptions {
  to: string | string[]
  from?: string | { email: string; name?: string }
  subject: string
  html: string
  text?: string
  attachments?: SendGridAttachment[]
}

export interface SendGridResult {
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
}

export async function sendEmailViaSendgrid(
  options: SendGridEmailOptions
): Promise<SendGridResult> {
  const apiKey = process.env.SENDGRID_API_KEY

  if (!apiKey) {
    console.warn(
      '[SendGrid] SENDGRID_API_KEY is not configured in environment variables. Email delivery skipped.'
    )
    return {
      success: false,
      skipped: true,
      error: 'SENDGRID_API_KEY not configured',
    }
  }

  // Format recipient list
  const recipientList = Array.isArray(options.to) ? options.to : [options.to]
  const validRecipients = recipientList
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'))

  if (validRecipients.length === 0) {
    return {
      success: false,
      error: 'No valid recipient email addresses provided',
    }
  }

  // Format sender
  const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL || 'invites@huddle.live'
  const defaultFromName = process.env.SENDGRID_FROM_NAME || 'Huddle'

  let fromObj: { email: string; name?: string }
  if (typeof options.from === 'string') {
    fromObj = { email: options.from, name: defaultFromName }
  } else if (options.from && options.from.email) {
    fromObj = {
      email: options.from.email,
      name: options.from.name || defaultFromName,
    }
  } else {
    fromObj = { email: defaultFromEmail, name: defaultFromName }
  }

  // Build personalizations
  const personalizations = validRecipients.map((email) => ({
    to: [{ email }],
  }))

  const content: Array<{ type: string; value: string }> = []
  if (options.text) {
    content.push({ type: 'text/plain', value: options.text })
  }
  if (options.html) {
    content.push({ type: 'text/html', value: options.html })
  }

  const payload: Record<string, unknown> = {
    personalizations,
    from: fromObj,
    subject: options.subject,
    content,
  }

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
      type: att.type,
      disposition: att.disposition || 'attachment',
    }))
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (res.status === 202 || res.status === 200) {
      const messageId = res.headers.get('x-message-id') || undefined
      return { success: true, messageId }
    }

    const errorBody = await res.text()
    console.warn(`[SendGrid] API responded with HTTP ${res.status}:`, errorBody)

    // Fallback to Resend if configured and SendGrid credits are exceeded or sender unverified
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fallbackRes = await resend.emails.send({
          from: 'Huddle <invites@huddle.live>',
          to: validRecipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
          })),
        })

        if (!fallbackRes.error) {
          return {
            success: true,
            messageId: fallbackRes.data?.id,
          }
        }
      } catch (fallbackErr) {
        console.warn('[Email Service] Secondary Resend fallback failed:', fallbackErr)
      }
    }

    return {
      success: false,
      error: `SendGrid error (${res.status}): ${errorBody}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown SendGrid network error'
    console.error('[SendGrid] Network request failed:', msg)
    return { success: false, error: msg }
  }
}
