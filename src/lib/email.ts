// src/lib/email.ts
// Server-side only — do NOT import from client components
import { Resend } from 'resend'

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY — add to .env.local (server-side only, no NEXT_PUBLIC_ prefix)')
  }
  return new Resend(apiKey)
}

/**
 * Send a transactional email via Resend.
 * @returns Resend message ID (e.g. "re_123abc")
 * @throws Error if RESEND_API_KEY is missing or Resend API returns an error
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<string> {
  const resend = getResendClient()
  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev'

  const { data, error } = await resend.emails.send({ from, to, subject, html })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return data!.id
}
