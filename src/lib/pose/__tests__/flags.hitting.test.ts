// src/lib/pose/__tests__/flags.hitting.test.ts
// TDD: Phase 02.5 Plan 03 — hitting flag detectors + IDEAL_RANGES

import { describe, it, expect } from 'vitest'
import { flagMechanics, IDEAL_RANGES } from '../flags'
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
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
  LEFT_HIP:       23,
  RIGHT_HIP:      24,
}

// High-visibility arm landmarks (indices 12, 14, 16) — used by many hitting checks
function makeArmVisible(): Record<number, Partial<NormalizedLandmark>> {
  return {
    [IDX.RIGHT_SHOULDER]: { visibility: VIS },
    [IDX.RIGHT_ELBOW]:    { visibility: VIS },
    [IDX.RIGHT_WRIST]:    { visibility: VIS },
  }
}

// High-visibility hip landmarks (indices 23, 24)
function makeHipsVisible(): Record<number, Partial<NormalizedLandmark>> {
  return {
    [IDX.LEFT_HIP]:  { visibility: VIS },
    [IDX.RIGHT_HIP]: { visibility: VIS },
  }
}

// ---------------------------------------------------------------------------
// IDEAL_RANGES
// ---------------------------------------------------------------------------

describe('IDEAL_RANGES', () => {
  it('exports elbowSlot range { min: 70, max: 110 }', () => {
    expect(IDEAL_RANGES.elbowSlot).toEqual({ min: 70, max: 110 })
  })

  it('exports shoulderTilt range { min: -20, max: 20 }', () => {
    expect(IDEAL_RANGES.shoulderTilt).toEqual({ min: -20, max: 20 })
  })

  it('exports hipRotation range { min: 75, max: 105 }', () => {
    expect(IDEAL_RANGES.hipRotation).toEqual({ min: 75, max: 105 })
  })
})

// ---------------------------------------------------------------------------
// detectElbowDrop (via flagMechanics hitting)
// ---------------------------------------------------------------------------

describe('detectElbowDrop', () => {
  it('returns Elbow Drop flag when elbowSlot=50 and arm landmarks are visible', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(50, null, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Elbow Drop')
    expect(flag).toBeDefined()
    expect(flag?.severity).toBe('warning')
    expect(flag?.jointIndices).toContain(IDX.RIGHT_ELBOW)
  })

  it('does NOT return Elbow Drop when elbowSlot=90 (in range)', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(90, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Elbow Drop')).toBeUndefined()
  })

  it('does NOT return Elbow Drop when elbowSlot=50 but arm visibility is LOW', () => {
    // all landmarks stay at LOW visibility (default from makeLandmarks)
    const lm = makeLandmarks()
    const flags = flagMechanics(50, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Elbow Drop')).toBeUndefined()
  })

  it('confidence is average of arm landmark visibilities (12, 14, 16)', () => {
    // All three at VIS=0.90 -> average = 0.90
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(50, null, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Elbow Drop')
    expect(flag?.confidence).toBeCloseTo(VIS, 5)
  })
})

// ---------------------------------------------------------------------------
// detectElbowTooHigh (via flagMechanics hitting)
// ---------------------------------------------------------------------------

describe('detectElbowTooHigh', () => {
  it('returns Elbow Too High flag when elbowSlot=130 and arm landmarks are visible', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(130, null, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Elbow Too High')
    expect(flag).toBeDefined()
    expect(flag?.severity).toBe('warning')
    expect(flag?.jointIndices).toContain(IDX.RIGHT_ELBOW)
  })

  it('does NOT return Elbow Too High when elbowSlot=90 (in range)', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(90, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Elbow Too High')).toBeUndefined()
  })

  it('does NOT return Elbow Too High when elbowSlot=130 but arm visibility is LOW', () => {
    const lm = makeLandmarks()
    const flags = flagMechanics(130, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Elbow Too High')).toBeUndefined()
  })

  it('severity is warning (not error)', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(130, null, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Elbow Too High')
    expect(flag?.severity).toBe('warning')
  })
})

// ---------------------------------------------------------------------------
// detectExcessiveShoulderTilt (via flagMechanics hitting)
// ---------------------------------------------------------------------------

describe('detectExcessiveShoulderTilt', () => {
  it('returns Excessive Shoulder Tilt when shoulderTilt=25 (> max 20) and arm visible', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(null, 25, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Excessive Shoulder Tilt')
    expect(flag).toBeDefined()
    expect(flag?.severity).toBe('warning')
    expect(flag?.jointIndices).toContain(IDX.LEFT_SHOULDER)
    expect(flag?.jointIndices).toContain(IDX.RIGHT_SHOULDER)
  })

  it('returns Excessive Shoulder Tilt when shoulderTilt=-25 (< min -20) and arm visible', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(null, -25, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Excessive Shoulder Tilt')).toBeDefined()
  })

  it('does NOT return flag when shoulderTilt=15 (within range)', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(null, 15, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Excessive Shoulder Tilt')).toBeUndefined()
  })

  it('does NOT return flag when arm landmark visibility is LOW', () => {
    const lm = makeLandmarks()
    const flags = flagMechanics(null, 25, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Excessive Shoulder Tilt')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// detectEarlyHipRotation (via flagMechanics hitting)
// ---------------------------------------------------------------------------

describe('detectEarlyHipRotation', () => {
  it('returns Early Hip Rotation flag when hipRotation=50 (< min 75) and hips visible', () => {
    const lm = makeLandmarks(makeHipsVisible())
    const flags = flagMechanics(null, null, 50, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Early Hip Rotation')
    expect(flag).toBeDefined()
    expect(flag?.jointIndices).toContain(IDX.LEFT_HIP)
    expect(flag?.jointIndices).toContain(IDX.RIGHT_HIP)
  })

  it('does NOT return flag when hipRotation=90 (in range)', () => {
    const lm = makeLandmarks(makeHipsVisible())
    const flags = flagMechanics(null, null, 90, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Early Hip Rotation')).toBeUndefined()
  })

  it('severity is error (not warning)', () => {
    const lm = makeLandmarks(makeHipsVisible())
    const flags = flagMechanics(null, null, 50, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Early Hip Rotation')
    expect(flag?.severity).toBe('error')
  })

  it('does NOT return flag when hip landmark visibility is LOW', () => {
    const lm = makeLandmarks() // all LOW visibility
    const flags = flagMechanics(null, null, 50, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Early Hip Rotation')).toBeUndefined()
  })

  it('confidence is average of hip landmark visibilities (23, 24)', () => {
    const lm = makeLandmarks(makeHipsVisible())
    const flags = flagMechanics(null, null, 50, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Early Hip Rotation')
    expect(flag?.confidence).toBeCloseTo(VIS, 5)
  })
})

// ---------------------------------------------------------------------------
// detectBatCasting (via flagMechanics hitting)
// ---------------------------------------------------------------------------

describe('detectBatCasting', () => {
  /**
   * Setup for Bat Casting detection (RHH lead-side: left wrist + left hip):
   *   leadWrist (15): x=0.8, visibility=VIS
   *   leadHip   (23): x=0.3, visibility=VIS
   *   leftShoulder (11): x=0.2, visibility=VIS (needed for shoulderWidth > 0.05)
   *   rightShoulder(12): x=0.7, visibility=VIS
   *
   *   shoulderWidth = |0.7 - 0.2| = 0.5
   *   wristDistFromHip = |0.8 - 0.3| = 0.5
   *   ratio = 0.5 / 0.5 = 1.0 > 0.6 → flags
   */
  function makeCastingLandmarks(): NormalizedLandmark[] {
    return makeLandmarks({
      [IDX.LEFT_WRIST]:     { x: 0.8, visibility: VIS },
      [IDX.LEFT_HIP]:       { x: 0.3, visibility: VIS },
      [IDX.LEFT_SHOULDER]:  { x: 0.2, visibility: VIS },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, visibility: VIS },
    })
  }

  /**
   * Wrist close to hip — ratio <= 0.6:
   *   leadWrist.x=0.4, leadHip.x=0.3 -> wristDistFromHip=0.1
   *   shoulderWidth=0.5 -> ratio = 0.1/0.5 = 0.2 (does not flag)
   */
  function makeNoCastingLandmarks(): NormalizedLandmark[] {
    return makeLandmarks({
      [IDX.LEFT_WRIST]:     { x: 0.4, visibility: VIS },
      [IDX.LEFT_HIP]:       { x: 0.3, visibility: VIS },
      [IDX.LEFT_SHOULDER]:  { x: 0.2, visibility: VIS },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, visibility: VIS },
    })
  }

  it('returns Bat Casting flag when wristDistFromHip / shoulderWidth > 0.6', () => {
    const lm = makeCastingLandmarks()
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    const flag = flags.find(f => f.issue === 'Bat Casting')
    expect(flag).toBeDefined()
    expect(flag?.severity).toBe('warning')
  })

  it('does NOT return flag when wristDistFromHip / shoulderWidth <= 0.6', () => {
    const lm = makeNoCastingLandmarks()
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Bat Casting')).toBeUndefined()
  })

  it('does NOT return flag when shoulderWidth <= 0.05 (side view — degenerate case)', () => {
    // Both shoulders at nearly the same x — side-view framing
    const lm = makeLandmarks({
      [IDX.LEFT_WRIST]:     { x: 0.8, visibility: VIS },
      [IDX.LEFT_HIP]:       { x: 0.3, visibility: VIS },
      [IDX.LEFT_SHOULDER]:  { x: 0.5, visibility: VIS },
      [IDX.RIGHT_SHOULDER]: { x: 0.5, visibility: VIS }, // same x -> shoulderWidth = 0
    })
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Bat Casting')).toBeUndefined()
  })

  it('does NOT return flag when leadWrist visibility is LOW', () => {
    const lm = makeCastingLandmarks()
    lm[IDX.LEFT_WRIST] = { ...lm[IDX.LEFT_WRIST], visibility: LOW }
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Bat Casting')).toBeUndefined()
  })

  it('does NOT return flag when leadHip visibility is LOW', () => {
    const lm = makeCastingLandmarks()
    lm[IDX.LEFT_HIP] = { ...lm[IDX.LEFT_HIP], visibility: LOW }
    const flags = flagMechanics(null, null, null, lm, 'hitting')
    expect(flags.find(f => f.issue === 'Bat Casting')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Cross-motion isolation — hitting flags must NOT fire for pitching
// ---------------------------------------------------------------------------

describe('cross-motion isolation — hitting flags do not fire for pitching', () => {
  it('Elbow Too High does NOT fire for motionType=pitching', () => {
    const lm = makeLandmarks(makeArmVisible())
    const flags = flagMechanics(130, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Elbow Too High')).toBeUndefined()
  })

  it('Early Hip Rotation does NOT fire for motionType=pitching', () => {
    const lm = makeLandmarks(makeHipsVisible())
    const flags = flagMechanics(null, null, 50, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Early Hip Rotation')).toBeUndefined()
  })

  it('Bat Casting does NOT fire for motionType=pitching', () => {
    const lm = makeLandmarks({
      [IDX.LEFT_WRIST]:     { x: 0.8, visibility: VIS },
      [IDX.LEFT_HIP]:       { x: 0.3, visibility: VIS },
      [IDX.LEFT_SHOULDER]:  { x: 0.2, visibility: VIS },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, visibility: VIS },
    })
    const flags = flagMechanics(null, null, null, lm, 'pitching')
    expect(flags.find(f => f.issue === 'Bat Casting')).toBeUndefined()
  })
})
