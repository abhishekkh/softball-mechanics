'use client'

import type { FrameAnalysis, AnalysisStatus, MechanicsFlag, MotionType } from '@/types/analysis'
import { IDEAL_RANGES, PITCHING_IDEAL_RANGES } from '@/lib/pose/flags'
import { AnalysisSummary } from './AnalysisSummary'

interface Props {
  frames: FrameAnalysis[]
  currentFrame: FrameAnalysis | null
  analysisStatus: AnalysisStatus | null
  progressPct: number
  framingWarning: string | null
  analysisErrorMessage: string | null
  showSkeleton: boolean
  onToggleSkeleton: () => void
  onStartReanalysis: () => void
  onPrevFlag: () => void
  onNextFlag: () => void
  hasPrevFlag: boolean
  hasNextFlag: boolean
  currentFlagIndex: number | null
  totalFlaggedFrames: number
  motionType?: MotionType  // Optional with fallback — backward compat
  vlmCommentary?: string | null
  onRequestCommentary?: () => Promise<void>
  isCommentaryLoading?: boolean
  onSendFeedbackEmail?: () => Promise<void>
  feedbackEmailStatus?: 'idle' | 'sending' | 'sent' | 'error'
  feedbackEmailError?: string | null
}

function AngleRow({
  label,
  value,
  idealMin,
  idealMax,
  unit = '°',
}: {
  label: string
  value: number | null
  idealMin: number
  idealMax: number
  unit?: string
}) {
  if (value === null) {
    return (
      <div className="flex justify-between items-center py-1.5 border-b border-neutral-700 last:border-0">
        <span className="text-sm text-neutral-400">{label}</span>
        <span className="text-xs text-neutral-500">Low visibility</span>
      </div>
    )
  }

  const inRange = value >= idealMin && value <= idealMax
  const displayValue = Math.round(Math.abs(value))

  return (
    <div className="flex justify-between items-center py-1.5 border-b border-neutral-700 last:border-0">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-mono font-semibold ${inRange ? 'text-emerald-400' : 'text-amber-400'}`}>
          {displayValue}{unit}
        </span>
        <span className="text-xs text-neutral-500 ml-1.5">
          ideal {idealMin}–{idealMax}{unit}
        </span>
      </div>
    </div>
  )
}

function FlagPanel({ flags }: { flags: MechanicsFlag[] }) {
  if (flags.length === 0) return (
    <p className="text-xs text-neutral-500 py-2">No mechanics issues on this frame</p>
  )

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <div
          key={i}
          className={`rounded p-2 text-sm ${
            flag.severity === 'error'
              ? 'bg-red-900/40 border border-red-700'
              : 'bg-amber-900/30 border border-amber-700'
          }`}
        >
          <div className="flex justify-between">
            <span className={flag.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>
              {flag.issue}
            </span>
            <span className="text-neutral-400 text-xs">
              {Math.round(flag.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MechanicsSidebar({
  frames,
  currentFrame,
  analysisStatus,
  progressPct,
  framingWarning,
  analysisErrorMessage,
  showSkeleton,
  onToggleSkeleton,
  onStartReanalysis,
  onPrevFlag,
  onNextFlag,
  hasPrevFlag,
  hasNextFlag,
  currentFlagIndex,
  totalFlaggedFrames,
  motionType = 'unknown',
  vlmCommentary,
  onRequestCommentary,
  isCommentaryLoading = false,
  onSendFeedbackEmail,
  feedbackEmailStatus = 'idle',
  feedbackEmailError = null,
}: Props) {
  const isAnalyzing = analysisStatus === 'analyzing' || analysisStatus === 'pending'
  const isComplete = analysisStatus === 'complete' || analysisStatus === 'low_confidence' || analysisStatus === 'error'
  const angles = currentFrame?.angles ?? null
  const flags = currentFrame?.flags ?? []

  const isPitching = motionType === 'pitching'
  const hipLabel    = isPitching ? 'Hip Drive'  : 'Hip Rotation'
  const elbowLabel  = isPitching ? 'Arm Slot'   : 'Elbow Slot'
  const hipRanges   = isPitching ? PITCHING_IDEAL_RANGES.hipDrive  : IDEAL_RANGES.hipRotation
  const elbowRanges = isPitching ? PITCHING_IDEAL_RANGES.elbowSlot : IDEAL_RANGES.elbowSlot
  // Shoulder tilt is identical for both motion types — no conditional needed

  return (
    <aside className="w-full lg:w-72 lg:min-h-0 bg-neutral-900 border-t border-neutral-700 lg:border-t-0 lg:border-l flex flex-col lg:overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Analysis progress */}
        {isAnalyzing && (
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Analyzing…</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Analysis error callout */}
        {analysisErrorMessage && (
          <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-300">
            Analysis error: {analysisErrorMessage}. Showing partial results below.
            You can re-analyze using the button at the bottom.
          </div>
        )}

        {/* Framing warning */}
        {framingWarning && (
          <div className="bg-amber-900/30 border border-amber-700 rounded p-2 text-xs text-amber-300">
            {framingWarning}
          </div>
        )}

        {/* Skeleton toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Skeleton Overlay</span>
          <button
            type="button"
            onClick={onToggleSkeleton}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              showSkeleton ? 'bg-blue-600' : 'bg-neutral-600'
            }`}
            aria-label={showSkeleton ? 'Hide skeleton overlay' : 'Show skeleton overlay'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                showSkeleton ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Motion type badge — shows which analysis mode was applied */}
        {motionType !== 'unknown' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400 uppercase tracking-wider">
              {motionType === 'pitching' ? 'Pitching Analysis' : 'Hitting Analysis'}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${motionType === 'pitching' ? 'bg-purple-500' : 'bg-blue-500'}`} />
          </div>
        )}

        {/* Current Frame — joint angles */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Current Frame
          </h3>
          {isComplete ? (
            <div>
              <AngleRow
                label={hipLabel}
                value={angles?.hipRotationDeg ?? null}
                idealMin={hipRanges.min}
                idealMax={hipRanges.max}
              />
              <AngleRow
                label={elbowLabel}
                value={angles?.elbowSlotDeg ?? null}
                idealMin={elbowRanges.min}
                idealMax={elbowRanges.max}
              />
              <AngleRow
                label="Shoulder Tilt"
                value={angles?.shoulderTiltDeg ?? null}
                idealMin={IDEAL_RANGES.shoulderTilt.min}
                idealMax={IDEAL_RANGES.shoulderTilt.max}
              />
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              {isAnalyzing ? 'Available after analysis completes' : 'Analysis not yet run'}
            </p>
          )}
        </section>

        {/* Current Frame — mechanics flags */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Mechanics Issues
            </h3>
            {totalFlaggedFrames > 0 && (
              <span className="text-xs text-neutral-500">
                {currentFlagIndex !== null ? `${currentFlagIndex + 1} / ${totalFlaggedFrames}` : totalFlaggedFrames + ' flagged'}
              </span>
            )}
          </div>
          <FlagPanel flags={flags} />

          {totalFlaggedFrames > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={onPrevFlag}
                disabled={!hasPrevFlag}
                className="flex-1 py-1.5 text-xs rounded bg-neutral-700 text-neutral-300 disabled:opacity-40 hover:bg-neutral-600 disabled:cursor-not-allowed transition-colors"
              >
                Prev Flag
              </button>
              <button
                type="button"
                onClick={onNextFlag}
                disabled={!hasNextFlag}
                className="flex-1 py-1.5 text-xs rounded bg-neutral-700 text-neutral-300 disabled:opacity-40 hover:bg-neutral-600 disabled:cursor-not-allowed transition-colors"
              >
                Next Flag
              </button>
            </div>
          )}
        </section>

        {/* Summary — always visible below current frame when analysis is complete */}
        {isComplete && (
          <section>
            <div className="border-t border-neutral-700 pt-4">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                Session Summary
              </h3>
              <AnalysisSummary
                frames={frames}
                theme="dark"
                vlmCommentary={vlmCommentary}
                onRequestCommentary={onRequestCommentary}
                isCommentaryLoading={isCommentaryLoading}
                analysisStatus={analysisStatus}
              />
              {/* Send feedback email — only shown when analysis is complete */}
              <div className="mt-4">
                {feedbackEmailStatus === 'sent' ? (
                  <p className="text-xs text-emerald-400 text-center">Feedback email sent!</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onSendFeedbackEmail}
                      disabled={!onSendFeedbackEmail || feedbackEmailStatus === 'sending'}
                      className="w-full py-2 text-xs rounded border border-blue-700 text-blue-300 hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title={!onSendFeedbackEmail ? 'No athlete assigned to this video' : 'Send AI feedback summary to athlete via email'}
                    >
                      {feedbackEmailStatus === 'sending' ? 'Sending\u2026' : 'Send feedback email'}
                    </button>
                    {feedbackEmailStatus === 'error' && feedbackEmailError && (
                      <p className="text-xs text-red-400 mt-1 text-center">{feedbackEmailError}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Re-analyze — pinned to bottom */}
      <div className="p-4 border-t border-neutral-700 flex-shrink-0">
        <button
          type="button"
          onClick={onStartReanalysis}
          disabled={isAnalyzing}
          className="w-full py-2 text-sm rounded bg-neutral-700 text-neutral-300 disabled:opacity-40 hover:bg-neutral-600 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>
    </aside>
  )
}
