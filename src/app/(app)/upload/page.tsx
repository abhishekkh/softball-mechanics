import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { UploadPageClient } from '@/components/upload/UploadPageClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Upload',
  description: 'Upload a video clip for instant AI-powered mechanics analysis.',
}

type ProfileRow = { id: string; full_name: string | null }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role ?? 'coach'

  // For coaches: fetch their athlete roster for the dropdown
  let athletes: { id: string; full_name: string }[] = []
  let athleteCoachId: string | undefined

  if (role === 'coach') {
    const { data } = await supabase
      .from('coach_athletes')
      .select('athlete_id, profiles!athlete_id(id, full_name)')
      .eq('coach_id', user.id)
      .eq('status', 'active')

    athletes = (data ?? [])
      .map(r => r.profiles as unknown as ProfileRow | null)
      .filter((p): p is ProfileRow => p !== null && p.full_name !== null) as { id: string; full_name: string }[]
  }

  // For athletes: look up their coach via service role (bypasses RLS; handles
  // cases where athlete_id is still NULL or email casing differs)
  if (role === 'athlete') {
    const admin = getAdmin()
    const { data } = await admin
      .from('coach_athletes')
      .select('coach_id')
      .or(`athlete_id.eq.${user.id},athlete_email.ilike.${user.email}`)
      .limit(1)
      .maybeSingle()

    athleteCoachId = data?.coach_id ?? undefined
  }

  return (
    <ErrorBoundary>
      <UploadPageClient
        coachId={role === 'coach' ? user.id : athleteCoachId}
        athleteId={role === 'athlete' ? user.id : undefined}
        athletes={athletes}
      />
    </ErrorBoundary>
  )
}
