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

  return (
    <UploadPageClient
      coachId={role === 'coach' ? user.id : undefined}
      athleteId={role === 'athlete' ? user.id : undefined}
      athletes={athletes}
    />
  )
}
