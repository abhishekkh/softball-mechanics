// src/lib/pose/__tests__/angles.test.ts
// TDD: Phase 02.5 Plan 03 — angle computation functions

import { describe, it, expect } from 'vitest'
import { angleBetweenThreePoints, computeElbowSlot, computeShoulderTilt, computeHipRotation } from '../angles'
import type { NormalizedLandmark } from '@/types/analysis'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIS_HIGH = 0.90 // above VISIBILITY_THRESHOLD (0.65)
const VIS_LOW  = 0.40 // below VISIBILITY_THRESHOLD

/** Build a 33-landmark array. Defaults to HIGH visibility — different from flags test pattern. */
function makeLm(overrides: Record<number, Partial<NormalizedLandmark>> = {}): NormalizedLandmark[] {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0, y: 0, z: 0,
    visibility: VIS_HIGH, // default HIGH — angle tests want visible landmarks by default
    ...(overrides[i] ?? {}),
  }))
}

// Landmark indices
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

// ---------------------------------------------------------------------------
// angleBetweenThreePoints
// ---------------------------------------------------------------------------

describe('angleBetweenThreePoints', () => {
  it('returns approximately 90° for a right-angle triplet A=(0,0) B=(0,1) C=(1,1)', () => {
    // BA = (0-0, 0-1) = (0,-1); BC = (1-0, 1-1) = (1,0) -> dot=0 -> 90°
    const A = { x: 0, y: 0 }
    const B = { x: 0, y: 1 }
    const C = { x: 1, y: 1 }
    expect(angleBetweenThreePoints(A, B, C)).toBeCloseTo(90, 1)
  })

  it('returns approximately 180° for collinear points A=(0,0) B=(0.5,0) C=(1,0)', () => {
    // BA = (-0.5, 0); BC = (0.5, 0) -> dot = -0.25 -> cos = -1 -> 180°
    const A = { x: 0,   y: 0 }
    const B = { x: 0.5, y: 0 }
    const C = { x: 1,   y: 0 }
    expect(angleBetweenThreePoints(A, B, C)).toBeCloseTo(180, 1)
  })

  it('returns approximately 90° for a symmetric V shape A=(0,0) B=(1,1) C=(2,0)', () => {
    // BA = (-1,-1); BC = (1,-1) -> dot = -1+1 = 0 -> 90°
    const A = { x: 0, y: 0 }
    const B = { x: 1, y: 1 }
    const C = { x: 2, y: 0 }
    expect(angleBetweenThreePoints(A, B, C)).toBeCloseTo(90, 1)
  })

  it('returns 0 for degenerate case (B same as A — zero-length vector)', () => {
    // BA = (0,0) -> magBA = 0 -> degenerate, returns 0
    const A = { x: 0.5, y: 0.5 }
    const B = { x: 0.5, y: 0.5 } // same as A
    const C = { x: 1.0, y: 0.5 }
    expect(angleBetweenThreePoints(A, B, C)).toBe(0)
  })

  it('returns value in range [0, 180]', () => {
    const A = { x: 0.1, y: 0.3 }
    const B = { x: 0.5, y: 0.5 }
    const C = { x: 0.9, y: 0.2 }
    const angle = angleBetweenThreePoints(A, B, C)
    expect(angle).toBeGreaterThanOrEqual(0)
    expect(angle).toBeLessThanOrEqual(180)
  })
})

// ---------------------------------------------------------------------------
// computeElbowSlot
// ---------------------------------------------------------------------------

describe('computeElbowSlot', () => {
  it('returns a number (not null) when right shoulder/elbow/wrist are above visibility threshold', () => {
    const lm = makeLm({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.2, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.4, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS_HIGH },
    })
    const result = computeElbowSlot(lm)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
  })

  it('returns null when right shoulder visibility is below VISIBILITY_THRESHOLD', () => {
    const lm = makeLm({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.2, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.4, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS_HIGH },
    })
    expect(computeElbowSlot(lm)).toBeNull()
  })

  it('returns null when right elbow visibility is below VISIBILITY_THRESHOLD', () => {
    const lm = makeLm({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.2, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.4, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS_HIGH },
    })
    expect(computeElbowSlot(lm)).toBeNull()
  })

  it('returns null when right wrist visibility is below VISIBILITY_THRESHOLD', () => {
    const lm = makeLm({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.2, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.4, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS_LOW },
    })
    expect(computeElbowSlot(lm)).toBeNull()
  })

  it('returns approximately 180° for a straight arm (shoulder/elbow/wrist collinear)', () => {
    // Straight vertical arm — elbow between shoulder and wrist on same line
    const lm = makeLm({
      [IDX.RIGHT_SHOULDER]: { x: 0.5, y: 0.0, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_ELBOW]:    { x: 0.5, y: 0.3, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_WRIST]:    { x: 0.5, y: 0.6, z: 0, visibility: VIS_HIGH },
    })
    const result = computeElbowSlot(lm)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(180, 1)
  })

  it('uses left-side landmarks when handedness=left', () => {
    // Left arm visible, right arm has low visibility
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.5, y: 0.0, z: 0, visibility: VIS_HIGH },
      [IDX.LEFT_ELBOW]:     { x: 0.5, y: 0.3, z: 0, visibility: VIS_HIGH },
      [IDX.LEFT_WRIST]:     { x: 0.5, y: 0.6, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_SHOULDER]: { x: 0.0, y: 0.0, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_ELBOW]:    { x: 0.0, y: 0.0, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_WRIST]:    { x: 0.0, y: 0.0, z: 0, visibility: VIS_LOW },
    })
    // With handedness='right' -> null (right arm low visibility)
    expect(computeElbowSlot(lm, 'right')).toBeNull()
    // With handedness='left' -> number (left arm visible)
    expect(computeElbowSlot(lm, 'left')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeShoulderTilt
// ---------------------------------------------------------------------------

describe('computeShoulderTilt', () => {
  it('returns a number when both shoulders are above visibility threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.3, y: 0.4, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, y: 0.4, z: 0, visibility: VIS_HIGH },
    })
    const result = computeShoulderTilt(lm)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
  })

  it('returns null when left shoulder visibility is below threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.3, y: 0.4, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, y: 0.4, z: 0, visibility: VIS_HIGH },
    })
    expect(computeShoulderTilt(lm)).toBeNull()
  })

  it('returns null when right shoulder visibility is below threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.3, y: 0.4, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_SHOULDER]: { x: 0.7, y: 0.4, z: 0, visibility: VIS_LOW },
    })
    expect(computeShoulderTilt(lm)).toBeNull()
  })

  it('returns approximately 0 when left and right shoulders are at the same y', () => {
    // Same y — horizontal shoulders — tilt should be ~0°
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.2, y: 0.5, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_SHOULDER]: { x: 0.8, y: 0.5, z: 0, visibility: VIS_HIGH },
    })
    // atan2(R.y - L.y, R.x - L.x) = atan2(0, 0.6) = 0
    const result = computeShoulderTilt(lm)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0, 1)
  })

  it('returns a positive value when right shoulder is lower than left (in image coords)', () => {
    // In image coords: higher y = lower on screen. R.y > L.y means right shoulder lower.
    // atan2(R.y - L.y, R.x - L.x) = atan2(positive, positive) = positive angle
    const lm = makeLm({
      [IDX.LEFT_SHOULDER]:  { x: 0.2, y: 0.3, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_SHOULDER]: { x: 0.8, y: 0.6, z: 0, visibility: VIS_HIGH },
    })
    const result = computeShoulderTilt(lm)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// computeHipRotation
// ---------------------------------------------------------------------------

describe('computeHipRotation', () => {
  it('returns a number when both hips are above visibility threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_HIP]:  { x: 0.3, y: 0.7, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_HIP]: { x: 0.7, y: 0.7, z: 0, visibility: VIS_HIGH },
    })
    const result = computeHipRotation(lm)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
  })

  it('returns null when left hip visibility is below threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_HIP]:  { x: 0.3, y: 0.7, z: 0, visibility: VIS_LOW },
      [IDX.RIGHT_HIP]: { x: 0.7, y: 0.7, z: 0, visibility: VIS_HIGH },
    })
    expect(computeHipRotation(lm)).toBeNull()
  })

  it('returns null when right hip visibility is below threshold', () => {
    const lm = makeLm({
      [IDX.LEFT_HIP]:  { x: 0.3, y: 0.7, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_HIP]: { x: 0.7, y: 0.7, z: 0, visibility: VIS_LOW },
    })
    expect(computeHipRotation(lm)).toBeNull()
  })

  it('returns approximately 0 when hips are at the same y (level hips)', () => {
    const lm = makeLm({
      [IDX.LEFT_HIP]:  { x: 0.2, y: 0.7, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_HIP]: { x: 0.8, y: 0.7, z: 0, visibility: VIS_HIGH },
    })
    const result = computeHipRotation(lm)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0, 1)
  })

  it('returns the same formula as computeShoulderTilt (atan2 of y-diff over x-diff)', () => {
    // Place hips in same relative config as shoulders to verify formula is consistent
    const lm = makeLm({
      [IDX.LEFT_HIP]:  { x: 0.2, y: 0.5, z: 0, visibility: VIS_HIGH },
      [IDX.RIGHT_HIP]: { x: 0.8, y: 0.8, z: 0, visibility: VIS_HIGH },
    })
    const result = computeHipRotation(lm)
    expect(result).not.toBeNull()
    // atan2(0.8-0.5, 0.8-0.2) = atan2(0.3, 0.6) in degrees
    const expected = Math.atan2(0.3, 0.6) * (180 / Math.PI)
    expect(result!).toBeCloseTo(expected, 5)
  })
})
