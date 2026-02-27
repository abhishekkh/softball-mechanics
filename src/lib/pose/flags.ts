// src/lib/pose/flags.ts
// Rule-based mechanics issue flagging
// Ideal angle ranges sourced from softball biomechanics literature (LOW confidence)
// Sources: PMC11969493 (Fastpitch Softball Pitching Biomechanics), PMC8739590
// VALIDATE THESE RANGES WITH A COACH BEFORE SHIPPING

import { LANDMARK_INDICES, VISIBILITY_THRESHOLD } from './landmarks'
import type { NormalizedLandmark, MechanicsFlag } from '@/types/analysis'

// Claude's discretion: conservative thresholds flagging only clear outliers
// Use wide ranges for v1 — only flag obvious mechanics problems
export const IDEAL_RANGES = {
  elbowSlot: { min: 70, max: 110 },        // degrees — wider range to reduce false positives
  shoulderTilt: { min: -20, max: 20 },     // degrees from horizontal
  hipRotation: { min: 75, max: 105 },      // degrees — hip opening angle at contact
} as const

// Claude's discretion: 70% confidence threshold to filter low-visibility noise
export const FLAG_CONFIDENCE_THRESHOLD = 0.70

/**
 * Validates video framing quality using a heuristic.
 * Returns a warning string if framing is suboptimal, null if framing is acceptable.
 *
 * Side-view check: If left and right hip X-coordinates are within 15% of frame width,
 * the athlete is facing camera (not side-on), which degrades elbow slot accuracy.
 */
export function checkFramingQuality(
  landmarks: NormalizedLandmark[]
): string | null {
  const L = landmarks[LANDMARK_INDICES.LEFT_HIP]
  const R = landmarks[LANDMARK_INDICES.RIGHT_HIP]
  if (!L || !R) return null
  if (L.visibility < VISIBILITY_THRESHOLD || R.visibility < VISIBILITY_THRESHOLD) return null

  const hipSeparation = Math.abs(R.x - L.x)
  if (hipSeparation < 0.15) {
    return 'Suboptimal framing: athlete appears to be facing the camera rather than side-on. Side view is required for accurate elbow slot and hip rotation analysis.'
  }
  return null
}

/**
 * Flags mechanics issues based on computed angles and landmark visibility.
 * Confidence is derived from the average visibility of the relevant joint landmarks.
 * Only flags when confidence >= FLAG_CONFIDENCE_THRESHOLD.
 */
export function flagMechanics(
  elbowSlot: number | null,
  shoulderTilt: number | null,
  hipRotation: number | null,
  landmarks: NormalizedLandmark[]
): MechanicsFlag[] {
  const flags: MechanicsFlag[] = []

  // Arm landmark confidence
  const armLandmarks = [12, 14, 16].map(i => landmarks[i]?.visibility ?? 0)
  const armConf = armLandmarks.reduce((s, v) => s + v, 0) / armLandmarks.length

  // Hip landmark confidence
  const hipLandmarks = [23, 24].map(i => landmarks[i]?.visibility ?? 0)
  const hipConf = hipLandmarks.reduce((s, v) => s + v, 0) / hipLandmarks.length

  if (elbowSlot !== null && armConf >= FLAG_CONFIDENCE_THRESHOLD) {
    if (elbowSlot < IDEAL_RANGES.elbowSlot.min) {
      flags.push({
        issue: 'Elbow Drop',
        confidence: armConf,
        severity: 'warning',
        jointIndices: [LANDMARK_INDICES.RIGHT_ELBOW],
      })
    }
    if (elbowSlot > IDEAL_RANGES.elbowSlot.max) {
      flags.push({
        issue: 'Elbow Too High',
        confidence: armConf,
        severity: 'warning',
        jointIndices: [LANDMARK_INDICES.RIGHT_ELBOW],
      })
    }
  }

  if (shoulderTilt !== null && armConf >= FLAG_CONFIDENCE_THRESHOLD) {
    if (Math.abs(shoulderTilt) > IDEAL_RANGES.shoulderTilt.max) {
      flags.push({
        issue: 'Excessive Shoulder Tilt',
        confidence: armConf,
        severity: 'warning',
        jointIndices: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.RIGHT_SHOULDER],
      })
    }
  }

  if (hipRotation !== null && hipConf >= FLAG_CONFIDENCE_THRESHOLD) {
    if (hipRotation < IDEAL_RANGES.hipRotation.min) {
      flags.push({
        issue: 'Early Hip Rotation',
        confidence: hipConf,
        severity: 'error',
        jointIndices: [LANDMARK_INDICES.LEFT_HIP, LANDMARK_INDICES.RIGHT_HIP],
      })
    }
  }

  return flags
}
