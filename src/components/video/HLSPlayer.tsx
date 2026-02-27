'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface HLSPlayerProps {
  src: string
  className?: string
  autoPlay?: boolean
  poster?: string
}

export function HLSPlayer({ src, className = '', autoPlay = false, poster }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      })
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data)
        }
      })

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari: native HLS
      video.src = src
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay={autoPlay}
      poster={poster}
      className={`w-full rounded-lg bg-black ${className}`}
    />
  )
}
