'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { VideoWithOverlay, type VideoWithOverlayHandle } from './VideoWithOverlay'
import { MechanicsSidebar } from './MechanicsSidebar'
import { AnalysisTimeline } from './AnalysisTimeline'
import { usePoseAnalysis } from '@/hooks/usePoseAnalysis'
import type { FrameAnalysis, MotionType } from '@/types/analysis'
import { sendFeedbackEmail } from '@/actions/feedback'

interface Props {
  videoId: string
  hlsUrl: string
  videoTitle: string | null
  motionType: MotionType  // Added Phase 2.2 — passed to usePoseAnalysis and sidebar
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

export function ReviewPageClient({ videoId, hlsUrl, videoTitle, motionType }: Props) {
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
  const { frames, analysisStatus, progressPct, framingWarning, analysisErrorMessage, startReanalysis, vlmSummary } =
    usePoseAnalysis(videoId, videoRef as React.RefObject<HTMLVideoElement | null>, motionType)

  // VLM commentary state — initialized from DB on page load via vlmSummary from hook
  const [vlmCommentary, setVlmCommentary] = useState<string | null>(null)
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false)

  // Feedback email state
  const [feedbackEmailStatus, setFeedbackEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [feedbackEmailError, setFeedbackEmailError] = useState<string | null>(null)

  // Sync vlmSummary from hook to local state on initial page load
  useEffect(() => {
    if (vlmSummary) setVlmCommentary(vlmSummary)
  }, [vlmSummary])

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

  // Extract the contact frame as base64 JPEG by seeking the video element to that timestamp
  const extractContactFrame = useCallback(async (timestampMs: number): Promise<string | null> => {
    const video = overlayRef.current?.videoElement
    if (!video) return null
    video.currentTime = timestampMs / 1000
    await new Promise<void>((resolve) => {
      video.addEventListener('seeked', () => resolve(), { once: true })
    })
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    return dataUrl.replace('data:image/jpeg;base64,', '')
  }, [])

  const handleSendFeedbackEmail = useCallback(async () => {
    setFeedbackEmailStatus('sending')
    setFeedbackEmailError(null)
    const result = await sendFeedbackEmail(videoId)
    if ('error' in result) {
      setFeedbackEmailStatus('error')
      setFeedbackEmailError(result.error)
    } else {
      setFeedbackEmailStatus('sent')
    }
  }, [videoId])

  const handleRequestCommentary = useCallback(async () => {
    const contactFrame = frames.find(f => f.isContact)
    if (!contactFrame || contactFrame.timestampMs === undefined) return
    setIsCommentaryLoading(true)
    try {
      const base64Frame = await extractContactFrame(contactFrame.timestampMs)
      if (!base64Frame) return
      const res = await fetch('/api/analysis/vlm-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Frame,
          motionType: motionType === 'unknown' ? 'hitting' : motionType,
          videoId,
        }),
      })
      if (res.ok) {
        const { description } = await res.json()
        setVlmCommentary(description ?? null)
      } else {
        const body = await res.json().catch(() => ({}))
        console.error('[ReviewPageClient] VLM eval failed', res.status, body)
      }
    } catch (err) {
      console.error('[ReviewPageClient] VLM commentary error:', err)
    } finally {
      setIsCommentaryLoading(false)
    }
  }, [frames, motionType, videoId, extractContactFrame])

  return (
    <div className="flex flex-col min-h-screen lg:h-screen bg-neutral-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-neutral-800 flex-shrink-0">
        <a href="/dashboard" className="text-neutral-400 hover:text-neutral-200 text-sm whitespace-nowrap">
          &larr; Dashboard
        </a>
        <h1 className="text-neutral-100 text-base font-medium truncate">
          {videoTitle ?? 'Review Session'}
        </h1>
      </header>

      {/* Main workspace — stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Video + timeline */}
        <div className="flex flex-col p-3 lg:p-4 gap-2 lg:flex-1 lg:overflow-hidden">
          {/* Video container: fixed 16:9 aspect on mobile, flex-1 on desktop */}
          <div className="aspect-video lg:aspect-auto lg:flex-1 lg:overflow-hidden relative bg-black">
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

        {/* Sidebar — full-width below video on mobile, fixed-width panel on desktop */}
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
          motionType={motionType}
          vlmCommentary={vlmCommentary}
          onRequestCommentary={handleRequestCommentary}
          isCommentaryLoading={isCommentaryLoading}
          onSendFeedbackEmail={handleSendFeedbackEmail}
          feedbackEmailStatus={feedbackEmailStatus}
          feedbackEmailError={feedbackEmailError}
        />
      </div>
    </div>
  )
}
