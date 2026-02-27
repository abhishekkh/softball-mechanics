import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SessionRow } from '@/components/dashboard/SessionRow'
import { InviteAthleteModal } from '@/components/roster/InviteAthleteModal'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Role guard: athletes don't have a dashboard
  if (user.user_metadata?.role === 'athlete') redirect('/submissions')

  // Fetch all videos for coach's athletes, most recent first, with athlete name
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id,
      thumbnail_url,
      status,
      uploaded_at,
      profiles!athlete_id (full_name)
    `)
    .eq('coach_id', user.id)
    .order('uploaded_at', { ascending: false })

  const isEmpty = !videos || videos.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Session Queue</h1>
        <InviteAthleteModal coachId={user.id} />
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">No sessions yet.</p>
          <p className="text-gray-400 text-sm mt-1">Invite an athlete to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <SessionRow
              key={v.id}
              videoId={v.id}
              thumbnailUrl={v.thumbnail_url}
              athleteName={(v.profiles as any)?.full_name ?? 'Unknown athlete'}
              uploadedAt={v.uploaded_at}
              status={v.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
