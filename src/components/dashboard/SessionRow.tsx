'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TranscodingStatus } from '@/components/upload/TranscodingStatus'
import type { SummaryFrame } from '@/components/review/AnalysisSummary'
import Image from 'next/image'

interface SessionRowProps {
  videoId: string
  thumbnailUrl?: string | null
  athleteName: string
  uploadedAt: string
  status: string
}

async function fetchVideoStatus(videoId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('videos')
    .select('status')
    .eq('id', videoId)
    .single()
  return data
}

// Fetches analysis summary only once analysis is confirmed complete.
// Returns null if analysis is pending/analyzing, or the frame summaries if done.
async function fetchAnalysisSummary(videoId: string): Promise<SummaryFrame[] | null> {
  const supabase = createClient()

  const { data: analysis } = await supabase
    .from('video_analyses')
    .select('status')
    .eq('video_id', videoId)
    .single()

  if (!analysis || !['complete', 'low_confidence'].includes(analysis.status)) return null

  // Fetch only flags + angles — skip landmarks blob
  const { data: frames } = await supabase
    .from('video_analysis_frames')
    .select('flags, elbow_slot_deg, shoulder_tilt_deg, hip_rotation_deg')
    .eq('video_id', videoId)
    .order('frame_index', { ascending: true })

  if (!frames) return null

  return frames.map((row) => ({
    flags: row.flags ?? [],
    angles: {
      hipRotationDeg: row.hip_rotation_deg,
      elbowSlotDeg: row.elbow_slot_deg,
      shoulderTiltDeg: row.shoulder_tilt_deg,
    },
  }))
}

export function SessionRow({ videoId, thumbnailUrl, athleteName, uploadedAt, status: initialStatus }: SessionRowProps) {
  const { data: statusData } = useQuery({
    queryKey: ['video-status', videoId],
    queryFn: () => fetchVideoStatus(videoId),
    initialData: { status: initialStatus },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'ready' || status === 'error') return false
      return 5000
    },
  })
  const liveStatus = statusData?.status ?? initialStatus

  const { data: summaryFrames } = useQuery({
    queryKey: ['analysis-summary', videoId],
    queryFn: () => fetchAnalysisSummary(videoId),
    enabled: liveStatus === 'ready',
    staleTime: Infinity,  // analysis data doesn't change once complete
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Row */}
      <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt="Video thumbnail"
              width={80}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Athlete info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{athleteName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(uploadedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Status badge */}
        <TranscodingStatus videoId={videoId} />

        {/* Review link */}
        {liveStatus === 'ready' && (
          <a
            href={`/review/${videoId}`}
            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            Review
          </a>
        )}
      </div>

      {/* Issue labels — shown once analysis is complete */}
      {summaryFrames && summaryFrames.length > 0 && (() => {
        const seen = new Map<string, 'warning' | 'error'>()
        for (const frame of summaryFrames) {
          for (const flag of frame.flags) {
            if (!seen.has(flag.issue)) seen.set(flag.issue, flag.severity)
          }
        }
        const issues = Array.from(seen.entries())
        return (
          <div className="border-t border-gray-100 px-4 py-2 flex flex-wrap gap-1.5">
            {issues.length === 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                Clean mechanics
              </span>
            ) : (
              issues.map(([issue, severity]) => (
                <span
                  key={issue}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    severity === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {issue}
                </span>
              ))
            )}
          </div>
        )
      })()}
    </div>
  )
}
