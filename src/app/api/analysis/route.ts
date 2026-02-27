// src/app/api/analysis/route.ts
// POST /api/analysis — persists MediaPipe pose analysis results from browser worker to Supabase
// Called by usePoseAnalysis hook after analysis completes

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { AnalysisPayload, FrameRow } from '@/types/analysis'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route handler — cannot set cookies on response after streaming starts
          }
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Verify authenticated user
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let payload: AnalysisPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { videoId, frames, framingWarning } = payload
  if (!videoId || !Array.isArray(frames)) {
    return NextResponse.json({ error: 'Missing required fields: videoId, frames' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 3. Verify the video exists and belongs to this coach
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, coach_id')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (video.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Set status to 'analyzing' to prevent race conditions on re-analyze
  await supabase
    .from('video_analyses')
    .update({ status: 'analyzing', progress_pct: 0 })
    .eq('video_id', videoId)

  // 5. Upsert all frame rows — ON CONFLICT ensures re-analysis cleanly overwrites
  const frameRows: FrameRow[] = frames.map((f) => ({
    video_id: videoId,
    frame_index: f.frameIndex,
    timestamp_ms: f.timestampMs,
    landmarks: f.landmarks,
    elbow_slot_deg: f.angles.elbowSlotDeg,
    shoulder_tilt_deg: f.angles.shoulderTiltDeg,
    hip_rotation_deg: f.angles.hipRotationDeg,
    flags: f.flags,
  }))

  const { error: upsertError } = await supabase
    .from('video_analysis_frames')
    .upsert(frameRows, { onConflict: 'video_id,frame_index' })

  if (upsertError) {
    console.error('[api/analysis] Frame upsert failed:', upsertError.message)
    await supabase
      .from('video_analyses')
      .update({ status: 'error', error_message: upsertError.message })
      .eq('video_id', videoId)
    return NextResponse.json({ error: 'Failed to save frame data' }, { status: 500 })
  }

  // 6. Mark analysis complete
  const { error: completeError } = await supabase
    .from('video_analyses')
    .update({
      status: frames.length > 0 ? 'complete' : 'low_confidence',
      progress_pct: 100,
      frame_count: frames.length,
      analyzed_at: new Date().toISOString(),
      framing_warning: framingWarning ?? null,
    })
    .eq('video_id', videoId)

  if (completeError) {
    console.error('[api/analysis] Status update failed:', completeError.message)
    return NextResponse.json({ error: 'Analysis saved but status update failed' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    videoId,
    frameCount: frames.length,
    status: frames.length > 0 ? 'complete' : 'low_confidence',
  })
}
