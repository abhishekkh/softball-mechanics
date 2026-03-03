import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReviewPageClient } from '@/components/review/ReviewPageClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

async function getVideo(videoId: string) {
  const supabase = await createClient()
  const { data: video } = await supabase
    .from('videos')
    .select('id, title, hls_url, coach_id, athlete_id, status, motion_type')
    .eq('id', videoId)
    .single()

  return video
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ videoId: string }>
}) {
  const { videoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const video = await getVideo(videoId)
  if (!video) notFound()

  // Only the coach who owns this video can access the review workspace
  if (video.coach_id !== user.id) redirect('/dashboard')

  // Video must be transcoded before analysis is possible
  if (video.status !== 'ready') redirect('/dashboard')

  return (
    <ErrorBoundary>
      <ReviewPageClient
        videoId={video.id}
        hlsUrl={video.hls_url as string}
        videoTitle={video.title as string | null}
        motionType={(video.motion_type ?? 'unknown') as import('@/types/analysis').MotionType}
      />
    </ErrorBoundary>
  )
}
