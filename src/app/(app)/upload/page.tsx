import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadPageClient } from '@/components/upload/UploadPageClient'

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

  // For athletes: look up their coach so videos can be associated correctly
  if (role === 'athlete') {
    const { data } = await supabase
      .from('coach_athletes')
      .select('coach_id')
      .eq('athlete_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single()

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
