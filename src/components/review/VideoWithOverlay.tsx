// src/components/review/VideoWithOverlay.tsx
// HLS video player with stacked canvas skeleton overlay
// Canvas is positioned absolutely over the video (pointer-events: none)
'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import { drawSkeleton } from '@/lib/pose/landmarks'
import type { FrameAnalysis, MechanicsFlag } from '@/types/analysis'

export interface VideoWithOverlayHandle {
  videoElement: HTMLVideoElement | null
}

interface Props {
  hlsUrl: string
  frames: FrameAnalysis[]
  showSkeleton: boolean
  onTimeUpdate?: (currentTimeSec: number) => void
}

// Find the nearest frame for a given time in milliseconds (±300ms window)
function findNearestFrame(
  frames: FrameAnalysis[],
  timMs: number
): FrameAnalysis | null {
  if (frames.length === 0) return null
  let nearest = frames[0]
  let minDiff = Math.abs(frames[0].timestampMs - timMs)
  for (const f of frames) {
    const diff = Math.abs(f.timestampMs - timMs)
    if (diff < minDiff) {
      minDiff = diff
      nearest = f
    }
  }
  // Only return if within 300ms of current time (1.5 frames at 5fps)
  return minDiff <= 300 ? nearest : null
}

export const VideoWithOverlay = forwardRef<VideoWithOverlayHandle, Props>(
  function VideoWithOverlay({ hlsUrl, frames, showSkeleton, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const hlsRef = useRef<Hls | null>(null)

    useImperativeHandle(ref, () => ({
      videoElement: videoRef.current,
    }))

    // Initialize HLS player
    useEffect(() => {
      const video = videoRef.current
      if (!video || !hlsUrl) return

      if (Hls.isSupported()) {
        const hls = new Hls()
        hlsRef.current = hls
        hls.loadSource(hlsUrl)
        hls.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari: native HLS support
        video.src = hlsUrl
      }

      return () => {
        hlsRef.current?.destroy()
        hlsRef.current = null
      }
    }, [hlsUrl])

    // No explicit size sync needed — canvas fills parent via CSS (absolute inset-0 w-full h-full)
    // Internal resolution is updated on each draw to match the actual display size

    // Draw skeleton on timeupdate — fires as video plays or is scrubbed
    useEffect(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const handleTimeUpdate = () => {
        const timMs = Math.round(video.currentTime * 1000)
        onTimeUpdate?.(video.currentTime)

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Sync internal resolution to actual display size on every draw
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (!showSkeleton || frames.length === 0) return

        const frameData = findNearestFrame(frames, timMs)
        if (!frameData || frameData.landmarks.length === 0) return

        // Collect flagged joint indices for red highlight
        const flaggedIndices = new Set<number>(
          frameData.flags.flatMap((f: MechanicsFlag) => f.jointIndices)
        )

        drawSkeleton(ctx, frameData.landmarks, canvas.width, canvas.height, flaggedIndices)
      }

      video.addEventListener('timeupdate', handleTimeUpdate)
      return () => video.removeEventListener('timeupdate', handleTimeUpdate)
    }, [frames, showSkeleton, onTimeUpdate])

    return (
      <div className="relative inline-block w-full">
        <video
          ref={videoRef}
          className="w-full block"
          controls
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>
    )
  }
)

