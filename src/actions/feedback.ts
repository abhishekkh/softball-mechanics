'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function sendFeedbackEmail(
  videoId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch video — must belong to the authenticated coach
  const { data: video } = await supabase
    .from('videos')
    .select('id, athlete_id, coach_id')
    .eq('id', videoId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!video) return { error: 'Video not found' }
  if (!video.athlete_id) return { error: 'No athlete assigned to this video' }

  // Fetch VLM summary from video_analyses
  const { data: analysis } = await supabase
    .from('video_analyses')
    .select('vlm_summary')
    .eq('video_id', videoId)
    .maybeSingle()

  // Fetch athlete email from coach_athletes (keyed by athlete_id)
  const { data: roster } = await supabase
    .from('coach_athletes')
    .select('athlete_email')
    .eq('coach_id', user.id)
    .eq('athlete_id', video.athlete_id)
    .maybeSingle()

  if (!roster?.athlete_email) return { error: 'No email on file for this athlete' }

  const summary = analysis?.vlm_summary ?? null
  const summaryText = summary
    ? summary
    : 'Your coach has reviewed your mechanics video. Log in to view your full analysis and joint angle data.'

  const submissionsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/submissions`

  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8;margin-bottom:16px">Mechanics Feedback from Your Coach</h2>
      <p style="color:#374151;line-height:1.6">${summaryText.replace(/\n/g, '<br/>')}</p>
      <p style="margin-top:24px">
        <a href="${submissionsUrl}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          View Full Analysis
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        You received this because your coach sent you mechanics feedback via Diamond Mechanics.
      </p>
    </div>
  `

  try {
    await sendEmail(
      roster.athlete_email,
      'Mechanics feedback from your coach',
      html
    )
  } catch (err) {
    console.error('[sendFeedbackEmail] Resend error:', err)
    return { error: 'Failed to send feedback email. Please try again.' }
  }

  return { success: true }
}
