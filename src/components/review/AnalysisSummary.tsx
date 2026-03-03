'use client'

import type { MechanicsFlag, AnalysisStatus } from '@/types/analysis'
import { IDEAL_RANGES } from '@/lib/pose/flags'

// Lightweight frame shape — FrameAnalysis satisfies this, and it's what
// the dashboard fetches (flags + angles only, no landmarks blob).
export interface SummaryFrame {
  flags: MechanicsFlag[]
  angles: {
    hipRotationDeg: number | null
    elbowSlotDeg: number | null
    shoulderTiltDeg: number | null
  }
  isContact?: boolean    // true on the estimated ball-contact frame (peak hip rotation) — added Phase 02.3
  timestampMs?: number   // video position in milliseconds; needed for Plan 03 Gemini frame extraction — added Phase 02.3
}

interface IssueTally {
  issue: string
  count: number
  severity: 'warning' | 'error'
}

interface AngleStat {
  label: string
  inRangePct: number  // 0–100
}

function computeIssueTallies(frames: SummaryFrame[]): IssueTally[] {
  const map = new Map<string, IssueTally>()
  for (const frame of frames) {
    for (const flag of frame.flags) {
      const existing = map.get(flag.issue)
      if (existing) {
        existing.count++
      } else {
        map.set(flag.issue, { issue: flag.issue, count: 1, severity: flag.severity })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

function computeAngleStats(frames: SummaryFrame[]): AngleStat[] {
  const defs: Array<{
    label: string
    getValue: (f: SummaryFrame) => number | null
    min: number
    max: number
  }> = [
    { label: 'Hip Rotation', getValue: (f) => f.angles.hipRotationDeg, ...IDEAL_RANGES.hipRotation },
    { label: 'Elbow Slot',   getValue: (f) => f.angles.elbowSlotDeg,   ...IDEAL_RANGES.elbowSlot },
    { label: 'Shoulder Tilt', getValue: (f) => f.angles.shoulderTiltDeg, ...IDEAL_RANGES.shoulderTilt },
  ]

  return defs.flatMap(({ label, getValue, min, max }) => {
    const measured = frames.filter((f) => getValue(f) !== null)
    if (measured.length === 0) return []
    const inRange = measured.filter((f) => {
      const v = Math.abs(getValue(f)!)
      return v >= min && v <= max
    })
    return [{ label, inRangePct: Math.round((inRange.length / measured.length) * 100) }]
  })
}

interface Props {
  frames: SummaryFrame[]
  theme?: 'dark' | 'light'
  vlmCommentary?: string | null       // Existing or freshly generated Gemini text
  onRequestCommentary?: () => Promise<void>  // Callback; ReviewPageClient implements
  isCommentaryLoading?: boolean       // True while Gemini call is in-flight
  analysisStatus?: AnalysisStatus | null  // Gate: only show button when complete/low_confidence
}

export function AnalysisSummary({
  frames,
  theme = 'dark',
  vlmCommentary,
  onRequestCommentary,
  isCommentaryLoading = false,
  analysisStatus,
}: Props) {
  if (frames.length === 0) {
    return (
      <p className={`text-xs py-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
        Summary available after analysis completes.
      </p>
    )
  }

  const issues = computeIssueTallies(frames)
  const goodAngles = computeAngleStats(frames).filter((s) => s.inRangePct >= 60)
  const flaggedFrameCount = frames.filter((f) => f.flags.length > 0).length

  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className={`flex gap-3 text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
        <span>{frames.length} frames analyzed</span>
        <span>·</span>
        <span className={flaggedFrameCount > 0
          ? (isDark ? 'text-amber-400' : 'text-amber-600')
          : (isDark ? 'text-emerald-400' : 'text-emerald-600')
        }>
          {flaggedFrameCount} flagged
        </span>
      </div>

      {/* Issue + good-angle labels — single wrapping row */}
      <div className="flex flex-wrap gap-1.5">
        {issues.length === 0 && goodAngles.length === 0 ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-100 text-gray-500'
          }`}>
            Low visibility — re-film from the side
          </span>
        ) : (
          <>
            {issues.map((tally) => (
              <span
                key={tally.issue}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  tally.severity === 'error'
                    ? isDark ? 'bg-red-900/60 text-red-300' : 'bg-red-100 text-red-700'
                    : isDark ? 'bg-amber-900/60 text-amber-300' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {tally.issue}
              </span>
            ))}
            {issues.length === 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDark ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              }`}>
                Clean mechanics
              </span>
            )}
            {goodAngles.map((stat) => (
              <span
                key={stat.label}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {stat.label} ✓
              </span>
            ))}
          </>
        )}
      </div>

      {/* AI Commentary — only show when analysis is complete/low_confidence and contact frame exists */}
      {(analysisStatus === 'complete' || analysisStatus === 'low_confidence') &&
        frames.some(f => f.isContact) && (
        <section>
          <div className={`border-t pt-4 ${isDark ? 'border-neutral-700' : 'border-gray-200'}`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
              AI Commentary
            </h3>
            {vlmCommentary ? (
              <div className="flex flex-col gap-2">
                <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                  {vlmCommentary}
                </p>
                {onRequestCommentary && (
                  <button
                    type="button"
                    onClick={onRequestCommentary}
                    disabled={isCommentaryLoading}
                    className={`text-xs self-start underline disabled:opacity-50 ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {isCommentaryLoading ? 'Regenerating\u2026' : 'Regenerate'}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onRequestCommentary}
                disabled={isCommentaryLoading || !onRequestCommentary}
                className={`w-full py-2 text-xs rounded border disabled:opacity-50 transition-colors ${
                  isDark
                    ? 'border-neutral-600 text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed'
                }`}
              >
                {isCommentaryLoading ? 'Getting AI Commentary\u2026' : 'Get AI Commentary'}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
