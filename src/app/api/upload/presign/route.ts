import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedPutUrl } from '@/lib/r2'
import { z } from 'zod'

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//),              // Must be a video MIME type
  athleteId: z.string().uuid().optional().nullable(),     // Optional — coach can upload without athlete assignment (deferred)
  coachId: z.string().uuid().optional().nullable(),       // Trusted only when authenticated user is athlete role
  motionType: z.enum(['hitting', 'pitching']).default('hitting'),  // Added Phase 2.2
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

  const { filename, contentType, athleteId, coachId, motionType } = parseResult.data

  // Role-aware coach_id resolution: athlete must provide their coach's ID
  const role = user.user_metadata?.role ?? 'coach'
  let resolvedCoachId: string
  if (role === 'athlete') {
    if (!coachId) {
      return NextResponse.json(
        { error: 'Athlete must be linked to a coach before uploading' },
        { status: 400 }
      )
    }
    resolvedCoachId = coachId
  } else {
    // Coach role: always use authenticated user's own ID (security: never trust client-provided coachId for coaches)
    resolvedCoachId = user.id
  }

  // Generate a unique video ID upfront (used as R2 key and DB record)
  const videoId = crypto.randomUUID()
  const ext = filename.split('.').pop() ?? 'mp4'
  const r2Key = `raw/${videoId}/original.${ext}`

  // Create initial video record in DB (status: 'processing')
  const { error: dbError } = await supabase.from('videos').insert({
    id: videoId,
    athlete_id: athleteId ?? null,
    uploaded_by: user.id,
    coach_id: resolvedCoachId,  // FIXED: uses athlete's actual coach when uploader is athlete
    title: filename.replace(/\.[^.]+$/, ''),  // Strip extension for default title
    raw_r2_key: r2Key,
    status: 'processing',
    motion_type: motionType,  // Added Phase 2.2
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Generate presigned URL — contentType must match exactly what browser sends
  let presignedUrl: string
  try {
    presignedUrl = await getPresignedPutUrl(r2Key, contentType)
  } catch (r2Err) {
    console.error('[presign] R2 presign failed:', r2Err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }

  return NextResponse.json({ presignedUrl, videoId, r2Key })
}
