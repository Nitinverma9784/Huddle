interface InviteEmailProps {
  quizTitle: string
  hostName: string
  scheduledAt: string
  timezone: string
  joinUrl: string
  roomCode?: string
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

  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; background-color: #ffffff; color: #0f172a; margin: 0; padding: 24px 16px;">
  <div style="max-width: 580px; margin: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 28px;">
    <a style="text-decoration: none; outline: none; display: inline-block; margin-bottom: 24px;" href="${joinUrl}" target="_blank">
      <img
        style="height: 38px; width: auto; display: block; border: 0; outline: none;"
        height="38"
        src="https://ik.imagekit.io/riufvimprm/huddle-logo.png"
        alt="Huddle"
      />
    </a>

    <div style="display: inline-block; background-color: #f5f3ff; color: #7c3aed; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
      Live Multiplayer Quiz
    </div>

    <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.25;">
      You're invited to play!
    </h1>

    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
      Hi, <strong>${hostName}</strong> has invited you to join a live interactive quiz session on <strong>Huddle</strong>.
    </p>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 18px 20px; margin: 0 0 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
        <strong style="color: #7c3aed;">Quiz:</strong> <span style="font-weight: 700; color: #0f172a;">${quizTitle}</span>
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
        <strong style="color: #7c3aed;">Scheduled Time:</strong> <span style="font-weight: 600; color: #0f172a;">${formattedDate} (${timezone})</span>
      </p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        &#128640; No account or sign-in needed &bull; Join instantly with 1 click
      </p>
    </div>

    <p style="margin: 0 0 24px 0; text-align: center;">
      <a
        style="
          display: inline-block;
          text-decoration: none;
          outline: none;
          color: #ffffff;
          background-color: #7c3aed;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
        "
        href="${joinUrl}"
        target="_blank"
      >
        Join Quiz Room &rarr;
      </a>
    </p>

    <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.5; word-break: break-all;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${joinUrl}" target="_blank" style="text-decoration: none; outline: none; color: #7c3aed; font-weight: 600;">${joinUrl}</a>
    </p>

    <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      Best regards,<br />
      <strong style="color: #0f172a;">The Huddle Team</strong>
    </p>
  </div>
</div>`
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
