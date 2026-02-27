import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RosterList, type Athlete } from '@/components/roster/RosterList'
import { InviteAthleteModal } from '@/components/roster/InviteAthleteModal'

export default async function RosterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.user_metadata?.role === 'athlete') redirect('/submissions')

  // Fetch coach's athlete roster with video counts
  const { data: rosterData } = await supabase
    .from('coach_athletes')
    .select(`
      id,
      athlete_email,
      status,
      invited_at,
      athlete_id,
      profiles!athlete_id (full_name)
    `)
    .eq('coach_id', user.id)
    .order('invited_at', { ascending: false })

  // Get video count per athlete
  const athleteIds = (rosterData ?? [])
    .filter(r => r.athlete_id)
    .map(r => r.athlete_id!)

  let videoCounts: Record<string, number> = {}
  if (athleteIds.length > 0) {
    const { data: countData } = await supabase
      .from('videos')
      .select('athlete_id')
      .in('athlete_id', athleteIds)
      .eq('coach_id', user.id)

    videoCounts = (countData ?? []).reduce((acc, v) => {
      acc[v.athlete_id] = (acc[v.athlete_id] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const athletes: Athlete[] = (rosterData ?? []).map(r => ({
    id: r.id,
    email: r.athlete_email,
    name: (r.profiles as any)?.full_name,
    status: r.status as 'pending' | 'active',
    videoCount: r.athlete_id ? (videoCounts[r.athlete_id] ?? 0) : 0,
    invitedAt: r.invited_at,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Roster</h1>
        <InviteAthleteModal coachId={user.id} />
      </div>
      <RosterList athletes={athletes} />
    </div>
  )
}
