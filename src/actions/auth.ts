'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

// Admin client for invite — uses service role key, server-only
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'coach', full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Role-based redirect: coaches → /dashboard, athletes → /submissions
  const role = data.user?.user_metadata?.role ?? 'coach'
  redirect(role === 'athlete' ? '/submissions' : '/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function inviteAthlete(email: string, coachId: string, athleteName: string, team?: string): Promise<{ success: true; userId: string | undefined } | { error: string }> {
  const admin = getAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

  let userId: string | undefined

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'athlete', invited_by: coachId, full_name: athleteName },
    redirectTo,
  })

  if (error) {
    console.error('[inviteAthlete] inviteUserByEmail error:', { status: error.status, message: error.message })
    if (error.status === 422 || error.message.toLowerCase().includes('already')) {
      // User already exists — send a magic link via OTP (implicit flow so no PKCE cookie needed)
      const implicitClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { flowType: 'implicit' } }
      )
      const { error: otpError } = await implicitClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      })
      if (otpError) {
        console.error('[inviteAthlete] signInWithOtp error:', { status: otpError.status, message: otpError.message })
        return { error: 'Failed to send invite link. Please try again.' }
      }
    } else {
      return { error: `Failed to send invite: ${error.message}` }
    }
  } else {
    userId = data.user?.id
  }

  // Ensure a coach_athletes record exists — insert only if one doesn't already exist
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('coach_athletes')
    .select('id')
    .eq('coach_id', coachId)
    .eq('athlete_email', email)
    .maybeSingle()

  if (!existing) {
    await supabase.from('coach_athletes').insert({
      coach_id: coachId,
      athlete_email: email,
      athlete_name: athleteName,
      team: team ?? null,
      status: 'pending',
    })
  } else {
    // Update name/team in case coach is re-inviting with corrected details
    await supabase.from('coach_athletes').update({
      athlete_name: athleteName,
      team: team ?? null,
    }).eq('id', existing.id)
  }

  // Send branded invite email via Resend (non-fatal — Supabase invite already sent)
  try {
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    await sendEmail(
      email,
      'Your coach has invited you to review your mechanics',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1d4ed8;margin-bottom:16px">You've been invited!</h2>
        <p style="color:#374151;line-height:1.6">Your coach has invited you to Diamond Mechanics where you can view detailed AI-powered analysis of your technique.</p>
        <p style="margin-top:24px">
          <a href="${inviteLink}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Accept Invite &amp; View Your Analysis
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>`
    )
  } catch (emailErr) {
    // Non-fatal — Supabase invite email already sent; log and continue
    console.error('[inviteAthlete] Resend branded email failed (non-fatal):', emailErr)
  }

  return { success: true, userId }
}

export async function acceptInvite(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    console.error('[acceptInvite] getUser failed:', error?.message)
    return { error: 'Not authenticated' }
  }

  const admin = getAdminClient()
  const { data: updatedRows, error: updateError } = await admin
    .from('coach_athletes')
    .update({
      athlete_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('athlete_email', user.email!)
    .eq('status', 'pending')
    .select('athlete_name')

  if (updateError) {
    console.error('[acceptInvite] update failed:', updateError.message, updateError.code)
    return { error: 'Failed to activate invite. Please try again.' }
  }

  // Backfill full_name if the profile was created without one (OTP re-invite path)
  const athleteName = updatedRows?.[0]?.athlete_name
  if (athleteName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.full_name) {
      await admin.from('profiles').update({ full_name: athleteName }).eq('id', user.id)
    }
  }

  return { success: true }
}
