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

  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; background-color: #ffffff; color: #0f172a; margin: 0; padding: 16px 8px; width: 100%; box-sizing: border-box;">
  <div style="width: 100%; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px 20px; box-sizing: border-box;">
    
    <a style="text-decoration: none; outline: none; display: inline-block; margin-bottom: 20px;" href="${joinUrl}" target="_blank">
      <img
        style="height: 34px; width: auto; display: block; border: 0; outline: none;"
        height="34"
        src="https://ik.imagekit.io/riufvimprm/huddle-logo.png"
        alt="Huddle"
      />
    </a>

    <div style="display: inline-block; background-color: #f5f3ff; color: #7c3aed; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
      Live Quiz Invitation
    </div>

    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
      You're invited to play!
    </h1>

    <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #334155;">
      Hi, <strong>${hostName}</strong> has invited you to join a live interactive quiz session on <strong>Huddle</strong>.
    </p>

    <div style="width: 100%; box-sizing: border-box; background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 16px; margin: 0 0 22px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
        <strong style="color: #7c3aed;">Quiz:</strong> <span style="font-weight: 700; color: #0f172a;">${quizTitle}</span>
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
        <strong style="color: #7c3aed;">Scheduled Time:</strong> <span style="font-weight: 600; color: #0f172a;">${formattedDate} (${timezone})</span>
      </p>
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        &#128640; No account or sign-in needed &bull; Join with 1 click from phone or browser
      </p>
    </div>

    <p style="margin: 0 0 20px 0; text-align: center;">
      <a
        style="
          display: block;
          width: 100%;
          box-sizing: border-box;
          text-decoration: none;
          outline: none;
          color: #ffffff;
          background-color: #7c3aed;
          padding: 14px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
          text-align: center;
        "
        href="${joinUrl}"
        target="_blank"
      >
        Open Huddle &amp; Join Quiz &rarr;
      </a>
    </p>

    <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b; line-height: 1.5; word-break: break-all;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${joinUrl}" target="_blank" style="text-decoration: none; outline: none; color: #7c3aed; font-weight: 600;">${joinUrl}</a>
    </p>

    <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 18px;">
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
