import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { ReviewPageClient } from '@/components/review/ReviewPageClient'

async function getVideo(videoId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: video } = await supabase
    .from('videos')
    .select('id, title, hls_url, coach_id, athlete_id, status')
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
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const video = await getVideo(videoId)
  if (!video) notFound()

  // Only the coach who owns this video can access the review workspace
  if (video.coach_id !== user.id) redirect('/dashboard')

  // Video must be transcoded before analysis is possible
  if (video.status !== 'ready') {
    redirect('/dashboard')
  }

  return (
    <ReviewPageClient
      videoId={video.id}
      hlsUrl={video.hls_url as string}
      videoTitle={video.title as string | null}
    />
  )
}
