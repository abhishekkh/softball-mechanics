'use client'

import type { FrameAnalysis } from '@/types/analysis'
import { IDEAL_RANGES } from '@/lib/pose/flags'

interface Props {
  frames: FrameAnalysis[]
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

function computeIssueTallies(frames: FrameAnalysis[]): IssueTally[] {
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

function computeAngleStats(frames: FrameAnalysis[]): AngleStat[] {
  const stats: AngleStat[] = []

  const angles: Array<{
    label: string
    getValue: (f: FrameAnalysis) => number | null
    min: number
    max: number
  }> = [
    {
      label: 'Hip Rotation',
      getValue: (f) => f.angles.hipRotationDeg,
      min: IDEAL_RANGES.hipRotation.min,
      max: IDEAL_RANGES.hipRotation.max,
    },
    {
      label: 'Elbow Slot',
      getValue: (f) => f.angles.elbowSlotDeg,
      min: IDEAL_RANGES.elbowSlot.min,
      max: IDEAL_RANGES.elbowSlot.max,
    },
    {
      label: 'Shoulder Tilt',
      getValue: (f) => f.angles.shoulderTiltDeg,
      min: IDEAL_RANGES.shoulderTilt.min,
      max: IDEAL_RANGES.shoulderTilt.max,
    },
  ]

  for (const { label, getValue, min, max } of angles) {
    const measured = frames.filter((f) => getValue(f) !== null)
    if (measured.length === 0) continue
    const inRange = measured.filter((f) => {
      const v = getValue(f)!
      return Math.abs(v) >= min && Math.abs(v) <= max
    })
    stats.push({ label, inRangePct: Math.round((inRange.length / measured.length) * 100) })
  }

  return stats
}

export function AnalysisSummary({ frames }: Props) {
  if (frames.length === 0) {
    return (
      <p className="text-xs text-neutral-500 py-2">
        Summary available after analysis completes.
      </p>
    )
  }

  const issues = computeIssueTallies(frames)
  const angleStats = computeAngleStats(frames)
  const goodAngles = angleStats.filter((s) => s.inRangePct >= 60)
  const flaggedFrameCount = frames.filter((f) => f.flags.length > 0).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex gap-3 text-xs text-neutral-400">
        <span>{frames.length} frames analyzed</span>
        <span>·</span>
        <span className={flaggedFrameCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
          {flaggedFrameCount} flagged
        </span>
      </div>

      {/* Needs Work */}
      <section>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Needs Work
        </h3>
        {issues.length === 0 ? (
          <p className="text-xs text-neutral-500">No mechanics issues detected.</p>
        ) : (
          <div className="space-y-1.5">
            {issues.map((tally) => (
              <div
                key={tally.issue}
                className={`flex items-center justify-between rounded px-2.5 py-2 text-sm ${
                  tally.severity === 'error'
                    ? 'bg-red-900/40 border border-red-700'
                    : 'bg-amber-900/30 border border-amber-700'
                }`}
              >
                <span className={tally.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>
                  {tally.issue}
                </span>
                <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
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
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Looking Good
          </h3>
          <div className="space-y-1.5">
            {goodAngles.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded px-2.5 py-2 text-sm bg-emerald-900/30 border border-emerald-700"
              >
                <span className="text-emerald-300">{stat.label}</span>
                <span className="text-xs text-neutral-400 ml-2 flex-shrink-0">
                  {stat.inRangePct}% in range
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {issues.length === 0 && goodAngles.length === 0 && (
        <p className="text-xs text-neutral-500">
          Angle data was low-visibility on most frames. Try re-filming from the side.
        </p>
      )}
    </div>
  )
}
