// src/lib/pose/__tests__/flags.pitching.test.ts
// TDD: Phase 02.3 Plan 01 — pitching flag detectors + PITCHING_IDEAL_RANGES

import { describe, it, expect } from 'vitest'
import { flagMechanics, PITCHING_IDEAL_RANGES } from '../flags'
import type { NormalizedLandmark } from '@/types/analysis'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIS = 0.90 // above FLAG_CONFIDENCE_THRESHOLD (0.70)
const LOW  = 0.50 // below FLAG_CONFIDENCE_THRESHOLD

/** Build a minimal 33-landmark array (all at origin, low visibility by default). */
function makeLandmarks(overrides: Record<number, Partial<NormalizedLandmark>> = {}): NormalizedLandmark[] {
  const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0, y: 0, z: 0, visibility: LOW,
  }))
  for (const [idx, vals] of Object.entries(overrides)) {
    lm[Number(idx)] = { ...lm[Number(idx)], ...vals }
  }
  return lm
}

// Landmark indices for convenience (mirrors LANDMARK_INDICES in landmarks.ts)
const IDX = {
  RIGHT_SHOULDER: 12,
  RIGHT_ELBOW: 14,
  RIGHT_WRIST: 16,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
}

// ---------------------------------------------------------------------------
// PITCHING_IDEAL_RANGES
// ---------------------------------------------------------------------------

describe('PITCHING_IDEAL_RANGES', () => {
  it('exports elbowSlot range { min: 60, max: 120 }', () => {
    expect(PITCHING_IDEAL_RANGES.elbowSlot).toEqual({ min: 60, max: 120 })
  })

  it('exports shoulderTilt range { min: -20, max: 20 }', () => {
    expect(PITCHING_IDEAL_RANGES.shoulderTilt).toEqual({ min: -20, max: 20 })
  })

  it('exports hipDrive range { min: 35, max: 60 }', () => {
    expect(PITCHING_IDEAL_RANGES.hipDrive).toEqual({ min: 35, max: 60 })
  })
})

// ---------------------------------------------------------------------------
// detectArmCircleBentElbow (via flagMechanics with motionType='pitching')
// ---------------------------------------------------------------------------

describe('detectArmCircleBentElbow', () => {
  /**
   * Build landmarks with shoulder-elbow-wrist in a straight line (angle ~180°).
   * Extended arm — should NOT trigger Arm Circle (Bent Elbow) flag.
   */
  function makeExtendedArm(): NormalizedLandmark[] {
    return makeLandmarks({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.2, z: 0, visibility: VIS },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.4, z: 0, visibility: VIS },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS },
    })
  }

  /**
   * Build landmarks with elbow at right angle (~90°, clearly bent).
   * shoulder at (0, 0), elbow at (0.3, 0), wrist at (0.3, 0.3) → angle at elbow ≈ 90°.
   */
  function makeBentArm90(): NormalizedLandmark[] {
    return makeLandmarks({
      [IDX.RIGHT_SHOULDER]: { x: 0.0, y: 0.0, z: 0, visibility: VIS },
      [IDX.RIGHT_ELBOW]:    { x: 0.3, y: 0.0, z: 0, visibility: VIS },
      [IDX.RIGHT_WRIST]:    { x: 0.3, y: 0.3, z: 0, visibility: VIS },
    })
  }

  /**
   * Arm at ~136° — clearly above threshold, should not flag.
   * shoulder(0, 0.2), elbow(0.5, 0), wrist(1, 0.2):
   * B->A = (-0.5, 0.2), B->C = (0.5, 0.2)
   * dot = -0.25 + 0.04 = -0.21
   * |B->A| = |B->C| = sqrt(0.25 + 0.04) approx 0.539
   * cos(angle) = -0.21 / (0.539^2) approx -0.724 -> angle approx 136 degrees
   */
  function makeArmAboveThreshold(): NormalizedLandmark[] {
    return makeLandmarks({
      [IDX.RIGHT_SHOULDER]: { x: 0.0, y: 0.2, z: 0, visibility: VIS },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.0, z: 0, visibility: VIS },
      [IDX.RIGHT_WRIST]:    { x: 1.0, y: 0.2, z: 0, visibility: VIS },
    })
  }

  it('returns Arm Circle (Bent Elbow) flag when elbow angle is ~90° (clearly bent)', () => {
    const lm = makeBentArm90()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    const bentFlag = flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')
    expect(bentFlag).toBeDefined()
    expect(bentFlag?.severity).toBe('warning')
    expect(bentFlag?.jointIndices).toContain(IDX.RIGHT_ELBOW)
  })

  it('returns no Arm Circle flag when arm is extended (~180°)', () => {
    const lm = makeExtendedArm()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')).toBeUndefined()
  })

  it('does NOT flag when elbow angle is ~136° (above 120° threshold)', () => {
    const lm = makeArmAboveThreshold()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')).toBeUndefined()
  })

  it('returns no flag when any landmark visibility is below threshold', () => {
    const lm = makeBentArm90()
    // lower elbow visibility below threshold
    lm[IDX.RIGHT_ELBOW] = { ...lm[IDX.RIGHT_ELBOW], visibility: LOW }
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')).toBeUndefined()
  })

  it('confidence is average of three landmark visibilities', () => {
    const lm = makeBentArm90()
    // all three have visibility VIS=0.90 -> avg = 0.90
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    const bentFlag = flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')
    expect(bentFlag?.confidence).toBeCloseTo(VIS, 5)
  })
})

// ---------------------------------------------------------------------------
// detectStrideOffPowerLine (via flagMechanics with motionType='pitching')
// ---------------------------------------------------------------------------

describe('detectStrideOffPowerLine', () => {
  function makeAnklesAligned(): NormalizedLandmark[] {
    // Both ankles have same z -> |delta| = 0, well under 0.15 threshold
    return makeLandmarks({
      [IDX.LEFT_ANKLE]:  { x: 0.3, y: 0.9, z: 0.10, visibility: VIS },
      [IDX.RIGHT_ANKLE]: { x: 0.6, y: 0.9, z: 0.10, visibility: VIS },
    })
  }

  function makeAnklesDeviating(): NormalizedLandmark[] {
    // z delta = 0.20 — above 0.15 threshold
    return makeLandmarks({
      [IDX.LEFT_ANKLE]:  { x: 0.3, y: 0.9, z: 0.00, visibility: VIS },
      [IDX.RIGHT_ANKLE]: { x: 0.6, y: 0.9, z: 0.20, visibility: VIS },
    })
  }

  it('returns Stride Off Power Line [Experimental] flag when z-delta > 0.15', () => {
    const lm = makeAnklesDeviating()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    const strideFlag = flags.find(f => f.issue === 'Stride Off Power Line [Experimental]')
    expect(strideFlag).toBeDefined()
    expect(strideFlag?.severity).toBe('warning')
    expect(strideFlag?.jointIndices).toContain(IDX.LEFT_ANKLE)
    expect(strideFlag?.jointIndices).toContain(IDX.RIGHT_ANKLE)
  })

  it('returns no flag when ankles are on the same z-plane', () => {
    const lm = makeAnklesAligned()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Stride Off Power Line [Experimental]')).toBeUndefined()
  })

  it('returns no flag when ankle visibility is below threshold', () => {
    const lm = makeAnklesDeviating()
    lm[IDX.LEFT_ANKLE] = { ...lm[IDX.LEFT_ANKLE], visibility: LOW }
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Stride Off Power Line [Experimental]')).toBeUndefined()
  })

  it('confidence is average of the two ankle visibilities', () => {
    const lm = makeAnklesDeviating()
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    const strideFlag = flags.find(f => f.issue === 'Stride Off Power Line [Experimental]')
    // both ankles set to VIS=0.90 -> avg = 0.90
    expect(strideFlag?.confidence).toBeCloseTo(VIS, 5)
  })
})

// ---------------------------------------------------------------------------
// Non-pitching motionType — new flags must NOT fire for hitting
// ---------------------------------------------------------------------------

describe('new pitching flags do not fire for hitting motionType', () => {
  it('does not return Arm Circle (Bent Elbow) for hitting', () => {
    const lm = makeLandmarks({
      [IDX.RIGHT_SHOULDER]: { x: 0.0, y: 0.0, z: 0, visibility: VIS },
      [IDX.RIGHT_ELBOW]:    { x: 0.3, y: 0.0, z: 0, visibility: VIS },
      [IDX.RIGHT_WRIST]:    { x: 0.3, y: 0.3, z: 0, visibility: VIS },
    })
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Arm Circle (Bent Elbow)')).toBeUndefined()
  })

  it('does not return Stride Off Power Line for hitting', () => {
    const lm = makeLandmarks({
      [IDX.LEFT_ANKLE]:  { x: 0.3, y: 0.9, z: 0.00, visibility: VIS },
      [IDX.RIGHT_ANKLE]: { x: 0.6, y: 0.9, z: 0.20, visibility: VIS },
    })
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Stride Off Power Line [Experimental]')).toBeUndefined()
  })
})
