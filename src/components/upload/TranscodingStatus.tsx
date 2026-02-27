'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface TranscodingStatusProps {
  videoId: string
  onReady?: (hlsUrl: string, thumbnailUrl: string) => void
}

async function fetchVideoStatus(videoId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('videos')
    .select('status, hls_url, thumbnail_url')
    .eq('id', videoId)
    .single()
  if (error) throw error
  return data
}

export function TranscodingStatus({ videoId, onReady }: TranscodingStatusProps) {
  const { data } = useQuery({
    queryKey: ['video-status', videoId],
    queryFn: () => fetchVideoStatus(videoId),
    refetchInterval: (query) => {
      // Stop polling once ready or error
      const status = query.state.data?.status
      if (status === 'ready' || status === 'error') return false
      return 5000  // Poll every 5 seconds while processing
    },
  })

  // onSuccess was removed in TanStack Query v5 — use useEffect instead
  useEffect(() => {
    if (data?.status === 'ready' && data.hls_url && data.thumbnail_url) {
      onReady?.(data.hls_url, data.thumbnail_url)
    }
  }, [data, onReady])

  const status = data?.status ?? 'processing'

  const labels: Record<string, string> = {
    processing: 'Processing…',
    ready:      'Ready for Review',
    reviewed:   'Reviewed',
    delivered:  'Delivered',
    error:      'Transcoding Failed',
  }

  const colors: Record<string, string> = {
    processing: 'bg-yellow-100 text-yellow-800',
    ready:      'bg-green-100 text-green-800',
    reviewed:   'bg-blue-100 text-blue-800',
    delivered:  'bg-purple-100 text-purple-800',
    error:      'bg-red-100 text-red-800',
  }

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] ?? colors.processing}`}>
      {labels[status] ?? 'Processing…'}
    </span>
  )
}
