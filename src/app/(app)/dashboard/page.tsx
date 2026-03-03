import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SessionRow } from '@/components/dashboard/SessionRow'
import { InviteAthleteModal } from '@/components/roster/InviteAthleteModal'

const PAGE_SIZE = 10

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Role guard: athletes don't have a dashboard
  if (user.user_metadata?.role === 'athlete') redirect('/submissions')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: videos, count } = await supabase
    .from('videos')
    .select(`
      id,
      thumbnail_url,
      status,
      uploaded_at,
      profiles!athlete_id (full_name)
    `, { count: 'exact' })
    .eq('coach_id', user.id)
    .order('uploaded_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
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
        <>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}`}
                    className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}`}
                    className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
