// src/components/review/AnalysisTimeline.tsx
// Renders color-coded markers on a progress bar for flagged frames
// Clicking a marker seeks the video to that frame

'use client'

import type { FrameAnalysis } from '@/types/analysis'

interface Props {
  frames: FrameAnalysis[]
  videoDurationSec: number
  currentTimeSec: number
  onSeek: (timeSec: number) => void
}

export function AnalysisTimeline({ frames, videoDurationSec, currentTimeSec, onSeek }: Props) {
  if (frames.length === 0 || videoDurationSec === 0) return null

  const flaggedFrames = frames.filter((f) => f.flags.length > 0)
  const contactFrame = frames.find((f) => f.isContact)

  return (
    <div className="relative w-full h-8 bg-neutral-800 rounded overflow-hidden mt-2">
      {/* Playhead indicator */}
      <div
        className="absolute top-0 h-full w-0.5 bg-white z-10 pointer-events-none"
        style={{ left: `${(currentTimeSec / videoDurationSec) * 100}%` }}
      />

      {/* Contact frame marker — white, full height, behind flag markers */}
      {contactFrame && (
        <button
          type="button"
          className="absolute top-0 h-full w-1 bg-white z-10 opacity-90 hover:opacity-100 cursor-pointer"
          style={{ left: `${(contactFrame.timestampMs / 1000 / videoDurationSec) * 100}%`, transform: 'translateX(-50%)' }}
          title={`Contact — ${(contactFrame.timestampMs / 1000).toFixed(1)}s`}
          onClick={() => onSeek(contactFrame.timestampMs / 1000)}
          aria-label="Seek to contact frame"
        />
      )}

      {/* Flagged frame markers */}
      {flaggedFrames.map((frame) => {
        const positionPct = (frame.timestampMs / 1000 / videoDurationSec) * 100
        const hasError = frame.flags.some((f) => f.severity === 'error')
        return (
          <button
            key={frame.frameIndex}
            type="button"
            className={`absolute top-1 h-6 w-1.5 rounded-sm cursor-pointer transition-opacity hover:opacity-100 opacity-80 z-20 ${
              hasError ? 'bg-red-500' : 'bg-yellow-400'
            }`}
            style={{ left: `${positionPct}%`, transform: 'translateX(-50%)' }}
            title={frame.flags.map((f) => `${f.issue} (${Math.round(f.confidence * 100)}%)`).join(', ')}
            onClick={() => onSeek(frame.timestampMs / 1000)}
            aria-label={`Seek to flagged frame at ${(frame.timestampMs / 1000).toFixed(1)}s`}
          />
        )
      })}
    </div>
  )
}
