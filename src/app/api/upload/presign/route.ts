import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedPutUrl } from '@/lib/r2'
import { z } from 'zod'

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//),              // Must be a video MIME type
  athleteId: z.string().uuid().optional().nullable(),     // Optional — coach can upload without athlete assignment (deferred)
  coachId: z.string().uuid(),                             // The coach's user ID
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parseResult = PresignSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 })
  }

  const { filename, contentType, athleteId, coachId } = parseResult.data

  // Generate a unique video ID upfront (used as R2 key and DB record)
  const videoId = crypto.randomUUID()
  const ext = filename.split('.').pop() ?? 'mp4'
  const r2Key = `raw/${videoId}/original.${ext}`

  // Create initial video record in DB (status: 'processing')
  const { error: dbError } = await supabase.from('videos').insert({
    id: videoId,
    athlete_id: athleteId ?? null,
    uploaded_by: user.id,
    coach_id: coachId,
    title: filename.replace(/\.[^.]+$/, ''),  // Strip extension for default title
    raw_r2_key: r2Key,
    status: 'processing',
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Generate presigned URL — contentType must match exactly what browser sends
  const presignedUrl = await getPresignedPutUrl(r2Key, contentType)

  return NextResponse.json({ presignedUrl, videoId, r2Key })
}
