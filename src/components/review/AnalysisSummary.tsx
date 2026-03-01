'use client'

import type { MechanicsFlag } from '@/types/analysis'
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
}

export function AnalysisSummary({ frames, theme = 'dark' }: Props) {
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
    <div className="flex flex-col gap-4">
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

      {/* Needs Work */}
      <section>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
          Needs Work
        </h3>
        {issues.length === 0 ? (
          <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
            No mechanics issues detected.
          </p>
        ) : (
          <div className="space-y-1.5">
            {issues.map((tally) => (
              <div
                key={tally.issue}
                className={`flex items-center justify-between rounded px-2.5 py-2 text-sm ${
                  tally.severity === 'error'
                    ? isDark
                      ? 'bg-red-900/40 border border-red-700'
                      : 'bg-red-50 border border-red-200'
                    : isDark
                      ? 'bg-amber-900/30 border border-amber-700'
                      : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <span className={tally.severity === 'error'
                  ? isDark ? 'text-red-300' : 'text-red-700'
                  : isDark ? 'text-amber-300' : 'text-amber-700'
                }>
                  {tally.issue}
                </span>
                <span className={`text-xs ml-2 flex-shrink-0 ${isDark ? 'text-neutral-400' : 'text-gray-400'}`}>
                  {tally.count} {tally.count === 1 ? 'frame' : 'frames'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Looking Good */}
      {goodAngles.length > 0 && (
        <section>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
            Looking Good
          </h3>
          <div className="space-y-1.5">
            {goodAngles.map((stat) => (
              <div
                key={stat.label}
                className={`flex items-center justify-between rounded px-2.5 py-2 text-sm ${
                  isDark
                    ? 'bg-emerald-900/30 border border-emerald-700'
                    : 'bg-emerald-50 border border-emerald-200'
                }`}
              >
                <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
                  {stat.label}
                </span>
                <span className={`text-xs ml-2 flex-shrink-0 ${isDark ? 'text-neutral-400' : 'text-gray-400'}`}>
                  {stat.inRangePct}% in range
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {issues.length === 0 && goodAngles.length === 0 && (
        <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
          Angle data was low-visibility on most frames. Try re-filming from the side.
        </p>
      )}
    </div>
  )
}
