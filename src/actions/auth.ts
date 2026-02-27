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

export async function inviteAthlete(email: string, coachId: string) {
  // Uses Supabase Admin API — inviteUserByEmail does NOT support PKCE
  // Athlete receives a magic link email; clicking it completes their signup
  const admin = getAdminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'athlete', invited_by: coachId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  if (error) throw error

  // Create pending coach_athletes record
  const supabase = await createClient()
  await supabase.from('coach_athletes').insert({
    coach_id: coachId,
    athlete_email: email,
    status: 'pending',
  })

  return { success: true, userId: data.user?.id }
}
