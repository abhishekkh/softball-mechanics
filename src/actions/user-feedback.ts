'use server'

import { sendEmail } from '@/lib/email'

export interface FeedbackPayload {
  message: string
  pageUrl: string
  referrer?: string
  steps?: string
  userAgent?: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ success: boolean; error?: string }> {
  const { message, pageUrl, referrer, steps, userAgent } = payload

  if (!message.trim()) {
    return { success: false, error: 'Feedback message is required.' }
  }

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  const pagePath = (() => {
    try {
      return new URL(pageUrl).pathname
    } catch {
      return pageUrl
    }
  })()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; margin: 0; padding: 0; background: #f9fafb; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 28px 32px; }
    h2 { margin: 0 0 4px; font-size: 20px; color: #1d4ed8; }
    .meta { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px; }
    .value { font-size: 14px; color: #111; background: #f3f4f6; border-radius: 6px; padding: 10px 14px; white-space: pre-wrap; word-break: break-word; }
    .url { font-family: monospace; font-size: 13px; }
    .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <h2>Feedback — Diamond Mechanics</h2>
      <p class="meta">Received on ${timestamp}</p>

      <div class="section">
        <div class="label">Page</div>
        <div class="value url">${pagePath}</div>
      </div>

      <div class="section">
        <div class="label">Full URL</div>
        <div class="value url">${pageUrl}</div>
      </div>

      ${referrer ? `
      <div class="section">
        <div class="label">Referred from</div>
        <div class="value url">${referrer}</div>
      </div>
      ` : ''}

      ${steps ? `
      <div class="section">
        <div class="label">What the user was doing</div>
        <div class="value">${steps.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
      ` : ''}

      <div class="section">
        <div class="label">Feedback</div>
        <div class="value">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>

      ${userAgent ? `
      <div class="footer">Browser: ${userAgent}</div>
      ` : ''}
    </div>
  </div>
</body>
</html>
`

  try {
    await sendEmail(
      'abhishekkh@gmail.com',
      `[Feedback] ${pagePath} — Diamond Mechanics`,
      html,
    )
    return { success: true }
  } catch (err) {
    console.error('[submitFeedback] Failed to send email:', err)
    return { success: false, error: 'Failed to send feedback. Please try again.' }
  }
}
