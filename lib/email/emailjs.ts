/**
 * EmailJS Email Delivery Service
 * Built with standard fetch to run seamlessly on both Node.js and Vercel Edge Runtime.
 * Uses EmailJS REST API: https://api.emailjs.com/api/v1.0/email/send
 */

export interface EmailJSAttachment {
  content: string // Base64 encoded string or URL
  filename: string
  type?: string
}

export interface EmailJSOptions {
  to: string | string[]
  toName?: string
  subject: string
  html?: string
  text?: string
  quizTitle?: string
  hostName?: string
  scheduledAt?: string
  timezone?: string
  joinUrl?: string
  message?: string
  attachments?: EmailJSAttachment[]
  templateParams?: Record<string, unknown>
}

export interface EmailJSResult {
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
}

/**
 * Dispatches emails via EmailJS REST API.
 * Configured via:
 * - EMAILJS_SERVICE_ID
 * - EMAILJS_TEMPLATE_ID
 * - EMAILJS_PUBLIC_KEY (or EMAILJS_USER_ID)
 * - EMAILJS_PRIVATE_KEY (optional Access Token)
 */
export async function sendEmailViaEmailJS(
  options: EmailJSOptions
): Promise<EmailJSResult> {
  // Dynamically load fresh .env.local values if in Node.js runtime (outside test runner)
  if (
    !process.env.NODE_TEST_CONTEXT &&
    (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY)
  ) {
    try {
      const fs = await import('fs')
      const path = await import('path')
      const envPath = path.resolve(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        content.split(/\r?\n/).forEach((line) => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
          if (match) {
            const key = match[1].trim()
            let value = (match[2] || '').replace(/\r/g, '').trim()
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
            if (!process.env[key] || process.env[key] === '') {
              process.env[key] = value.trim()
            }
          }
        })
      }
    } catch {}
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  if (!serviceId || !templateId || !publicKey) {
    console.warn(
      '[EmailJS] Configuration missing: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, or EMAILJS_PUBLIC_KEY is not configured in environment variables. Email delivery skipped.'
    )
    return {
      success: false,
      skipped: true,
      error: 'EmailJS environment variables not configured',
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

  // Format readable scheduled time
  let readableScheduledTime = options.scheduledAt || ''
  if (options.scheduledAt && !isNaN(new Date(options.scheduledAt).getTime())) {
    try {
      readableScheduledTime = new Date(options.scheduledAt).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: options.timezone || 'UTC',
      })
    } catch {
      readableScheduledTime = options.scheduledAt
    }
  }

  let allSuccess = true
  let lastError: string | undefined

  for (const recipient of validRecipients) {
    const templateParams: Record<string, unknown> = {
      to_email: recipient,
      email: recipient,
      to_name: options.toName || recipient.split('@')[0],
      subject: options.subject,
      quiz_title: options.quizTitle || 'Live Quiz',
      host_name: options.hostName || 'Huddle Host',
      scheduled_at: readableScheduledTime,
      timezone: options.timezone || 'UTC',
      join_url: options.joinUrl || '',
      message: options.html || options.message || options.text || '',
      html_content: options.html || '',
      content: options.html || options.text || '',
      message_text: options.text || options.message || '',
      ...(options.templateParams || {}),
    }

    const payload: Record<string, unknown> = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
    }

    // Include accessToken if private key is configured
    if (privateKey) {
      payload.accessToken = privateKey
    }

    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 200) {
        continue
      }

      const errorBody = await res.text()
      console.warn(`[EmailJS] API responded with HTTP ${res.status}:`, errorBody)
      allSuccess = false
      lastError = `EmailJS error (${res.status}): ${errorBody}`

      // Secondary Fallback to Resend if configured
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend')
          const resend = new Resend(process.env.RESEND_API_KEY)
          const fallbackRes = await resend.emails.send({
            from: 'Huddle <invites@huddle.live>',
            to: recipient,
            subject: options.subject,
            html: options.html || `<p>${options.message || 'Join my live quiz on Huddle!'}</p>`,
            text: options.text,
          })

          if (!fallbackRes.error) {
            allSuccess = true
            lastError = undefined
          }
        } catch (fallbackErr) {
          console.warn('[Email Service] Secondary Resend fallback failed:', fallbackErr)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown EmailJS network error'
      console.error('[EmailJS] Network request failed:', msg)
      allSuccess = false
      lastError = msg
    }
  }

  if (allSuccess) {
    return { success: true }
  }

  return {
    success: false,
    error: lastError || 'Failed to dispatch email via EmailJS',
  }
}
