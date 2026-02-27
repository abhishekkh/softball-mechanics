// src/lib/pose/angles.ts
// Joint angle computation using 3-point vector math
// Source: MDN Math.atan2 + biomechanics research pattern

import { LANDMARK_INDICES, VISIBILITY_THRESHOLD } from './landmarks'
import type { NormalizedLandmark, FrameAngles } from '@/types/analysis'

interface Point { x: number; y: number }

/**
 * Computes the angle (degrees) at joint B given A-B-C landmark triplet.
 * Returns value in range [0, 180].
 */
export function angleBetweenThreePoints(A: Point, B: Point, C: Point): number {
  const BA = { x: A.x - B.x, y: A.y - B.y }
  const BC = { x: C.x - B.x, y: C.y - B.y }

  const dot = BA.x * BC.x + BA.y * BC.y
  const magBA = Math.sqrt(BA.x ** 2 + BA.y ** 2)
  const magBC = Math.sqrt(BC.x ** 2 + BC.y ** 2)

  if (magBA === 0 || magBC === 0) return 0

  // Clamp to [-1, 1] to guard against floating point drift past acos domain
  const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return Math.acos(cosTheta) * (180 / Math.PI)
}

/**
 * Elbow slot: angle at elbow (shoulder -> elbow -> wrist).
 * Uses right side (RHH). Returns null if any landmark visibility < threshold.
 */
export function computeElbowSlot(
  landmarks: NormalizedLandmark[],
  handedness: 'right' | 'left' = 'right'
): number | null {
  const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST } = LANDMARK_INDICES
  const [shoulderIdx, elbowIdx, wristIdx] = handedness === 'right'
    ? [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST]
    : [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST]

  const s = landmarks[shoulderIdx]
  const e = landmarks[elbowIdx]
  const w = landmarks[wristIdx]
  if (!s || !e || !w) return null
  if (s.visibility < VISIBILITY_THRESHOLD || e.visibility < VISIBILITY_THRESHOLD || w.visibility < VISIBILITY_THRESHOLD) return null

  return angleBetweenThreePoints(s, e, w)
}

/**
 * Shoulder tilt: angle of shoulder line from horizontal (degrees).
 * Positive = right shoulder higher, Negative = left shoulder higher.
 * Returns null if either shoulder visibility < threshold.
 */
export function computeShoulderTilt(landmarks: NormalizedLandmark[]): number | null {
  const L = landmarks[LANDMARK_INDICES.LEFT_SHOULDER]
  const R = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]
  if (!L || !R) return null
  if (L.visibility < VISIBILITY_THRESHOLD || R.visibility < VISIBILITY_THRESHOLD) return null

  return Math.atan2(R.y - L.y, R.x - L.x) * (180 / Math.PI)
}

/**
 * Hip rotation: angle of hip line from horizontal (degrees).
 * Same formula as shoulder tilt but for hips.
 * Returns null if either hip visibility < threshold.
 */
export function computeHipRotation(landmarks: NormalizedLandmark[]): number | null {
  const L = landmarks[LANDMARK_INDICES.LEFT_HIP]
  const R = landmarks[LANDMARK_INDICES.RIGHT_HIP]
  if (!L || !R) return null
  if (L.visibility < VISIBILITY_THRESHOLD || R.visibility < VISIBILITY_THRESHOLD) return null

  return Math.atan2(R.y - L.y, R.x - L.x) * (180 / Math.PI)
}

/**
 * Compute all three softball mechanics angles for a frame.
 */
export function computeFrameAngles(
  landmarks: NormalizedLandmark[],
  handedness: 'right' | 'left' = 'right'
): FrameAngles {
  return {
    elbowSlotDeg: computeElbowSlot(landmarks, handedness),
    shoulderTiltDeg: computeShoulderTilt(landmarks),
    hipRotationDeg: computeHipRotation(landmarks),
  }
}
