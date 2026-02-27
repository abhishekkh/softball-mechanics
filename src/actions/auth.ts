'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

export async function inviteAthlete(email: string, coachId: string): Promise<{ success: true; userId: string | undefined } | { error: string }> {
  // Uses Supabase Admin API — inviteUserByEmail does NOT support PKCE
  // Athlete receives a magic link email; clicking it completes their signup
  const admin = getAdminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'athlete', invited_by: coachId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/invite/accept`,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.status === 422) {
      return { error: 'This email is already registered. Ask the athlete to sign in directly.' }
    }
    return { error: 'Failed to send invite. Please try again.' }
  }

  // Create pending coach_athletes record
  const supabase = await createClient()
  await supabase.from('coach_athletes').insert({
    coach_id: coachId,
    athlete_email: email,
    status: 'pending',
  })

  return { success: true, userId: data.user?.id }
}

export async function acceptInvite() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const admin = getAdminClient()
  const { error: updateError } = await admin
    .from('coach_athletes')
    .update({
      athlete_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('athlete_email', user.email!)
    .eq('status', 'pending')

  if (updateError) throw updateError
  return { success: true }
}
