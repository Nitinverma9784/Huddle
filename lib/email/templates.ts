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
  roomCode,
}: InviteEmailProps): string {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone || 'UTC',
  })

  // Extract room code from joinUrl if not provided
  const code = roomCode || joinUrl.split('/').pop() || 'HUDDLE'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to a live quiz on Huddle!</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: separate;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
        padding: 12px !important;
      }
      .email-card {
        padding: 24px 18px !important;
        border-radius: 16px !important;
      }
      .button-cta {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #f6f3fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto;" class="email-wrapper">
      
      <!-- Logo Header -->
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${joinUrl}" target="_blank" style="display: inline-block;">
            <img src="https://ik.imagekit.io/riufvimprm/huddle-logo.png" alt="Huddle" width="160" height="auto" style="display: block; max-height: 48px; width: auto; border: 0; outline: none; margin: 0 auto;" />
          </a>
        </td>
      </tr>

      <!-- Main Card Container -->
      <tr>
        <td>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #ede5fc; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.07); overflow: hidden;" class="email-card">
            
            <!-- Top Gradient Accent Bar -->
            <tr>
              <td style="height: 6px; background: linear-gradient(90deg, #7c3aed 0%, #6366f1 50%, #a855f7 100%);"></td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 36px 32px 32px 32px;">
                
                <!-- Pill Badge -->
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="display: inline-block; background-color: #f3e8ff; color: #7c3aed; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase;">
                    &#10024; Live Multiplayer Quiz
                  </span>
                </div>

                <!-- Main Headline -->
                <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; text-align: center; color: #0f172a; letter-spacing: -0.5px; line-height: 1.25;">
                  You're Invited to Play!
                </h1>
                
                <p style="margin: 0 0 28px 0; font-size: 15px; text-align: center; color: #475569; line-height: 1.5;">
                  <strong style="color: #0f172a;">${hostName}</strong> has scheduled a live interactive quiz on Huddle and invited you to compete with others in real-time.
                </p>

                <!-- Session Highlights Box -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, #faf7fd 0%, #f7f2fc 100%); border-radius: 18px; border: 1px solid #ede3fa; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 22px 20px;">
                      
                      <!-- Quiz Title Item -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px;">
                        <tr>
                          <td width="28" valign="top" style="font-size: 18px; line-height: 1;">&#127942;</td>
                          <td style="padding-left: 8px;">
                            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #7c3aed; letter-spacing: 0.5px;">Quiz Title</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${quizTitle}</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Schedule Time Item -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px;">
                        <tr>
                          <td width="28" valign="top" style="font-size: 18px; line-height: 1;">&#128197;</td>
                          <td style="padding-left: 8px;">
                            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #7c3aed; letter-spacing: 0.5px;">Scheduled For</div>
                            <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px;">${formattedDate}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 1px;">Timezone: ${timezone}</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Room Code Item -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="28" valign="top" style="font-size: 18px; line-height: 1;">&#128273;</td>
                          <td style="padding-left: 8px;">
                            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #7c3aed; letter-spacing: 0.5px;">Room Code</div>
                            <div style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 18px; font-weight: 800; color: #7c3aed; background-color: #ffffff; padding: 4px 10px; border-radius: 8px; border: 1px solid #ddd6fe; margin-top: 3px; letter-spacing: 1.5px;">
                              ${code}
                            </div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Primary CTA Button -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <a href="${joinUrl}" target="_blank" class="button-cta" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 700; text-align: center; box-shadow: 0 8px 20px rgba(124, 58, 237, 0.35); border: 0;">
                        Enter Quiz Room &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Key Perks / Features -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                  <tr>
                    <td align="center" style="font-size: 12px; color: #64748b; line-height: 1.6;">
                      &#128640; <strong>No sign-in required</strong> &bull; Join instantly from any phone or laptop<br>
                      &#9889; <strong>Speed bonus active</strong> &bull; Faster correct answers score higher!
                    </td>
                  </tr>
                </table>

                <!-- Fallback URL Link -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 12px 16px; border: 1px dashed #cbd5e1; text-align: center;">
                  <span style="font-size: 12px; color: #64748b;">Having trouble with the button? Copy this link:</span>
                  <div style="font-size: 12px; color: #7c3aed; word-break: break-all; font-weight: 600; margin-top: 4px;">
                    <a href="${joinUrl}" target="_blank" style="color: #7c3aed; text-decoration: underline;">${joinUrl}</a>
                  </div>
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 24px 12px; font-size: 12px; color: #8b5cf6;">
          <div style="margin-bottom: 6px; font-weight: 700; color: #6d28d9;">Huddle &bull; Real-Time Multiplayer Quiz Platform</div>
          <div style="color: #64748b;">Automated invitation sent on behalf of ${hostName}.</div>
        </td>
      </tr>

    </table>
  </center>
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
