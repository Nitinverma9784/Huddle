interface InviteEmailProps {
  quizTitle: string
  hostName: string
  scheduledAt: string
  timezone: string
  joinUrl: string
}

export function renderInviteHtml({
  quizTitle,
  hostName,
  scheduledAt,
  timezone,
  joinUrl,
}: InviteEmailProps): string {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone || 'UTC',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're invited to a live Huddle quiz!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #7c3aed; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; }
    .details { background: #f1f5f9; border-radius: 12px; padding: 16px 20px; margin: 24px 0; }
    .btn { display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0; }
    .footer { font-size: 12px; color: #64748b; text-align: center; padding: 24px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Huddle</h1>
    </div>
    <div class="content">
      <h2>You're invited to play!</h2>
      <p><strong>${hostName}</strong> has invited you to join a live interactive quiz on <strong>Huddle</strong>.</p>
      
      <div class="details">
        <p style="margin: 4px 0;"><strong>Quiz:</strong> ${quizTitle}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedDate} (${timezone})</p>
      </div>

      <p>No account required. Simply click the link below to join when the session begins:</p>

      <div style="text-align: center;">
        <a href="${joinUrl}" class="btn" style="color: #ffffff;">Join Quiz Room</a>
      </div>

      <p style="font-size: 13px; color: #64748b; word-break: break-all;">Direct link: <a href="${joinUrl}">${joinUrl}</a></p>
    </div>
    <div class="footer">
      Sent with Huddle &bull; The AI-Powered Multiplayer Quiz Platform
    </div>
  </div>
</body>
</html>
`
}

export function renderInviteText({
  quizTitle,
  hostName,
  scheduledAt,
  timezone,
  joinUrl,
}: InviteEmailProps): string {
  return `You're invited to a live quiz on Huddle!

Host: ${hostName}
Quiz: ${quizTitle}
Scheduled: ${new Date(scheduledAt).toLocaleString()} (${timezone})

Join with this link (no login needed):
${joinUrl}

See you there!
- The Huddle Team
`
}
