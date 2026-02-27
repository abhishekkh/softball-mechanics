import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { UploadPageClient } from '@/components/upload/UploadPageClient'

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
      .map(r => (r.profiles as any))
      .filter(Boolean)
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
    <UploadPageClient
      coachId={role === 'coach' ? user.id : athleteCoachId}
      athleteId={role === 'athlete' ? user.id : undefined}
      athletes={athletes}
    />
  )
}
