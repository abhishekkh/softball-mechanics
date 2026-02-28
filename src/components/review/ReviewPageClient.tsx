'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { VideoWithOverlay, type VideoWithOverlayHandle } from './VideoWithOverlay'
import { MechanicsSidebar } from './MechanicsSidebar'
import { AnalysisTimeline } from './AnalysisTimeline'
import { usePoseAnalysis } from '@/hooks/usePoseAnalysis'
import type { FrameAnalysis } from '@/types/analysis'

interface Props {
  videoId: string
  hlsUrl: string
  videoTitle: string | null
}

// Find the nearest FrameAnalysis to a given time in seconds
function findFrameAtTime(frames: FrameAnalysis[], timeSec: number): FrameAnalysis | null {
  if (frames.length === 0) return null
  const timMs = timeSec * 1000
  let nearest = frames[0]
  let minDiff = Math.abs(frames[0].timestampMs - timMs)
  for (const f of frames) {
    const diff = Math.abs(f.timestampMs - timMs)
    if (diff < minDiff) { minDiff = diff; nearest = f }
  }
  return minDiff <= 300 ? nearest : null
}

export function ReviewPageClient({ videoId, hlsUrl, videoTitle }: Props) {
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [videoDurationSec, setVideoDurationSec] = useState(0)
  const [flagNavIndex, setFlagNavIndex] = useState(0)

  const overlayRef = useRef<VideoWithOverlayHandle>(null)
  const videoRef = useMemo(() => ({
    get current() { return overlayRef.current?.videoElement ?? null }
  }), [])

  // Destructure all values including analysisErrorMessage — required to pass to MechanicsSidebar
  // so the error callout is rendered per CONTEXT.md locked decision:
  // "show partial results with a warning — do not hide data"
  const { frames, analysisStatus, progressPct, framingWarning, analysisErrorMessage, startReanalysis } =
    usePoseAnalysis(videoId, videoRef as React.RefObject<HTMLVideoElement | null>)

  const currentFrame = useMemo(
    () => findFrameAtTime(frames, currentTimeSec),
    [frames, currentTimeSec]
  )

  // All flagged frames sorted by timestamp
  const flaggedFrames = useMemo(
    () => frames.filter((f) => f.flags.length > 0),
    [frames]
  )

  // Find current flag index based on current time
  const currentFlagIndex = useMemo(() => {
    if (flaggedFrames.length === 0) return null
    const idx = flaggedFrames.findIndex(
      (f) => Math.abs(f.timestampMs / 1000 - currentTimeSec) <= 0.3
    )
    return idx >= 0 ? idx : null
  }, [flaggedFrames, currentTimeSec])

  const handleTimeUpdate = useCallback((timeSec: number) => {
    setCurrentTimeSec(timeSec)
    const video = overlayRef.current?.videoElement
    if (video && video.duration) setVideoDurationSec(video.duration)
  }, [])

  const handleSeek = useCallback((timeSec: number) => {
    const video = overlayRef.current?.videoElement
    if (video) video.currentTime = timeSec
  }, [])

  const handlePrevFlag = useCallback(() => {
    const idx = flagNavIndex > 0 ? flagNavIndex - 1 : 0
    setFlagNavIndex(idx)
    if (flaggedFrames[idx]) handleSeek(flaggedFrames[idx].timestampMs / 1000)
  }, [flagNavIndex, flaggedFrames, handleSeek])

  const handleNextFlag = useCallback(() => {
    const idx = Math.min(flagNavIndex + 1, flaggedFrames.length - 1)
    setFlagNavIndex(idx)
    if (flaggedFrames[idx]) handleSeek(flaggedFrames[idx].timestampMs / 1000)
  }, [flagNavIndex, flaggedFrames, handleSeek])

  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-neutral-800">
        <a href="/dashboard" className="text-neutral-400 hover:text-neutral-200 text-sm">
          &larr; Dashboard
        </a>
        <h1 className="text-neutral-100 text-base font-medium truncate">
          {videoTitle ?? 'Review Session'}
        </h1>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video + timeline */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-2">
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <VideoWithOverlay
              ref={overlayRef}
              hlsUrl={hlsUrl}
              frames={frames}
              showSkeleton={showSkeleton}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
          <AnalysisTimeline
            frames={frames}
            videoDurationSec={videoDurationSec}
            currentTimeSec={currentTimeSec}
            onSeek={handleSeek}
          />
        </div>

        {/* Sidebar — analysisErrorMessage passed so error callout renders when status === 'error' */}
        <MechanicsSidebar
          frames={frames}
          currentFrame={currentFrame}
          analysisStatus={analysisStatus}
          progressPct={progressPct}
          framingWarning={framingWarning}
          analysisErrorMessage={analysisErrorMessage}
          showSkeleton={showSkeleton}
          onToggleSkeleton={() => setShowSkeleton((v) => !v)}
          onStartReanalysis={startReanalysis}
          onPrevFlag={handlePrevFlag}
          onNextFlag={handleNextFlag}
          hasPrevFlag={flagNavIndex > 0}
          hasNextFlag={flagNavIndex < flaggedFrames.length - 1}
          currentFlagIndex={currentFlagIndex}
          totalFlaggedFrames={flaggedFrames.length}
        />
      </div>
    </div>
  )
}
