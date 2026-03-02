// src/lib/pose/flags.ts
// Rule-based mechanics issue flagging
// Ideal angle ranges sourced from softball biomechanics literature (LOW confidence)
// Sources: PMC11969493 (Fastpitch Softball Pitching Biomechanics), PMC8739590
// VALIDATE THESE RANGES WITH A COACH BEFORE SHIPPING

import { LANDMARK_INDICES, VISIBILITY_THRESHOLD } from './landmarks'
import { angleBetweenThreePoints } from './angles'
import type { NormalizedLandmark, MechanicsFlag, FrameAnalysis, MotionType } from '@/types/analysis'

/**
 * Marks the estimated ball-contact frame (peak hip rotation) with isContact=true.
 * Returns a new array — does not mutate input.
 */
export function markContactFrame(frames: FrameAnalysis[]): FrameAnalysis[] {
  let contactIdx = -1
  let maxHipRot = -Infinity
  for (let i = 0; i < frames.length; i++) {
    const hip = frames[i].angles.hipRotationDeg
    if (hip !== null && hip > maxHipRot) {
      maxHipRot = hip
      contactIdx = i
    }
  }
  if (contactIdx < 0) return frames
  return frames.map((f, i) => i === contactIdx ? { ...f, isContact: true } : f)
}

// Claude's discretion: conservative thresholds flagging only clear outliers
// Use wide ranges for v1 — only flag obvious mechanics problems
export const IDEAL_RANGES = {
  elbowSlot: { min: 70, max: 110 },        // degrees — wider range to reduce false positives
  shoulderTilt: { min: -20, max: 20 },     // degrees from horizontal
  hipRotation: { min: 75, max: 105 },      // degrees — hip opening angle at contact
} as const

// Claude's discretion: 70% confidence threshold to filter low-visibility noise
export const FLAG_CONFIDENCE_THRESHOLD = 0.70

// Pitching-specific ideal ranges — added Phase 02.3
// Source: PMC11969493 (hip rotation 44 ± 12° at release), clinical judgment for others
// LOW-MEDIUM confidence — validate with coach before shipping
export const PITCHING_IDEAL_RANGES = {
  elbowSlot:    { min: 60, max: 120 },   // wider band — windmill allows more variation
  shoulderTilt: { min: -20, max: 20 },   // same constraint as hitting
  hipDrive:     { min: 35, max: 60 },    // pelvic rotation degrees at ball release
} as const

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
 * Bat Casting: lead wrist extends too far from the body before contact.
 * Indicates a long, looping swing path that loses power and bat speed.
 * Uses lead-side landmarks (right-handed hitter: left wrist + left hip = lead side).
 *
 * Threshold: wrist-to-hip distance > 0.6× shoulder width (normalized coordinates).
 * LOW confidence threshold — validate against real footage before tightening.
 *
 * Source: MVP Batting Cages softball swing mechanics coaching resources.
 * Note: Hardcoded to right-handed hitter (left wrist/hip = lead side).
 *       Left-handed support is a future enhancement — document this limitation.
 */
function detectBatCasting(landmarks: NormalizedLandmark[]): MechanicsFlag[] {
  const leadWrist = landmarks[LANDMARK_INDICES.LEFT_WRIST]    // index 15 — lead wrist for RHH
  const leadHip = landmarks[LANDMARK_INDICES.LEFT_HIP]        // index 23 — lead hip for RHH
  const leftShoulder = landmarks[LANDMARK_INDICES.LEFT_SHOULDER]  // index 11
  const rightShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER] // index 12

  if (!leadWrist || !leadHip || !leftShoulder || !rightShoulder) return []
  if (leadWrist.visibility < FLAG_CONFIDENCE_THRESHOLD) return []
  if (leadHip.visibility < FLAG_CONFIDENCE_THRESHOLD) return []

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x)
  if (shoulderWidth < 0.05) return []  // Side view — shoulders too close to measure; skip

  const wristDistFromHip = Math.abs(leadWrist.x - leadHip.x)

  if (wristDistFromHip / shoulderWidth > 0.6) {
    const conf = (leadWrist.visibility + leadHip.visibility) / 2
    return [{
      issue: 'Bat Casting',
      confidence: conf,
      severity: 'warning',
      jointIndices: [LANDMARK_INDICES.LEFT_WRIST, LANDMARK_INDICES.LEFT_ELBOW],
    }]
  }
  return []
}

/**
 * Premature Shoulder Opening: upper body rotates toward the plate before hips
 * have reached their rotation threshold. Disrupts the kinetic chain sequencing
 * that transfers power from the lower body through the arm.
 *
 * Detection: shoulder tilt near 0° (level/facing batter) while hip rotation < 30°.
 * Thresholds are conservative (LOW confidence) — only flags obvious outliers.
 * Validate and refine against real pitching footage.
 *
 * Source: PMC11969493 — Fastpitch Softball Pitching Biomechanics 2025.
 */
function detectPrematureShoulderOpening(
  shoulderTilt: number | null,
  hipRotation: number | null,
): MechanicsFlag[] {
  if (shoulderTilt === null || hipRotation === null) return []

  // Shoulder "open" = facing batter = low absolute tilt angle
  const shoulderOpen = Math.abs(shoulderTilt) < 10
  // Hips "still loading" = square to plate = low hip rotation
  const hipsNotYetRotated = Math.abs(hipRotation) < 30

  if (shoulderOpen && hipsNotYetRotated) {
    return [{
      issue: 'Premature Shoulder Opening',
      confidence: 0.75,  // Fixed proxy — no per-landmark confidence in this version
      severity: 'warning',
      jointIndices: [LANDMARK_INDICES.LEFT_SHOULDER, LANDMARK_INDICES.RIGHT_SHOULDER],
    }]
  }
  return []
}

/**
 * Arm Circle (Bent Elbow): pitching arm elbow angle drops below extension threshold
 * during wind-up phase, indicating the arm circle is breaking down.
 *
 * Threshold: < 120° (conservative — only clearly bent elbows, avoids false positives
 * on follow-through where elbow naturally flexes post-release).
 * Right-handed pitcher: uses right arm landmarks (shoulder 12, elbow 14, wrist 16).
 * Left-handed pitcher support is a future enhancement.
 *
 * Source: PMC8739590 qualitative arm-circle description; no prescriptive angle in literature.
 * Claude discretion on threshold per CONTEXT.md.
 *
 * Added Phase 02.3.
 */
function detectArmCircleBentElbow(landmarks: NormalizedLandmark[]): MechanicsFlag[] {
  const shoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER]  // index 12
  const elbow    = landmarks[LANDMARK_INDICES.RIGHT_ELBOW]     // index 14
  const wrist    = landmarks[LANDMARK_INDICES.RIGHT_WRIST]     // index 16

  if (!shoulder || !elbow || !wrist) return []
  if (shoulder.visibility < FLAG_CONFIDENCE_THRESHOLD) return []
  if (elbow.visibility < FLAG_CONFIDENCE_THRESHOLD) return []
  if (wrist.visibility < FLAG_CONFIDENCE_THRESHOLD) return []

  const elbowAngle = angleBetweenThreePoints(shoulder, elbow, wrist)
  // Extended arm during wind-up should be > 140°. Threshold at 120° flags only
  // clearly bent elbows — conservative to avoid false positives.
  const BENT_THRESHOLD = 120

  if (elbowAngle < BENT_THRESHOLD) {
    const conf = (shoulder.visibility + elbow.visibility + wrist.visibility) / 3
    return [{
      issue: 'Arm Circle (Bent Elbow)',
      confidence: conf,
      severity: 'warning',
      jointIndices: [LANDMARK_INDICES.RIGHT_ELBOW],
    }]
  }
  return []
}

/**
 * Stride Off Power Line: stride foot (left ankle for RHP) lands significantly off
 * the pitcher's power line, measured using MediaPipe normalized z-coordinate
 * (depth estimate relative to hip midpoint).
 *
 * [Experimental] — MediaPipe z-coordinate is a depth estimate and less reliable than x/y.
 * For side-view footage (required by this app's framing quality check), stride direction
 * runs along the camera's depth axis, making z the correct axis to check.
 * Threshold: |z_delta| > 0.15 normalized units, derived from PMC11542118 ±0.2m mean.
 *
 * Right-handed pitcher: LEFT_ANKLE (27) = stride foot, RIGHT_ANKLE (28) = pivot foot.
 *
 * Added Phase 02.3.
 */
function detectStrideOffPowerLine(landmarks: NormalizedLandmark[]): MechanicsFlag[] {
  const strideAnkle = landmarks[LANDMARK_INDICES.LEFT_ANKLE]   // index 27 — stride foot RHP
  const driveAnkle  = landmarks[LANDMARK_INDICES.RIGHT_ANKLE]  // index 28 — pivot foot RHP

  if (!strideAnkle || !driveAnkle) return []
  if (strideAnkle.visibility < FLAG_CONFIDENCE_THRESHOLD) return []
  if (driveAnkle.visibility < FLAG_CONFIDENCE_THRESHOLD) return []

  // Use z-axis (depth) for side-view camera — stride direction is into/out of camera plane
  const depthOffset = Math.abs(strideAnkle.z - driveAnkle.z)
  const STRIDE_OFFSET_THRESHOLD = 0.15  // normalized depth units, per PMC11542118

  if (depthOffset > STRIDE_OFFSET_THRESHOLD) {
    const conf = (strideAnkle.visibility + driveAnkle.visibility) / 2
    return [{
      issue: 'Stride Off Power Line [Experimental]',
      confidence: conf,
      severity: 'warning',
      jointIndices: [LANDMARK_INDICES.LEFT_ANKLE, LANDMARK_INDICES.RIGHT_ANKLE],
    }]
  }
  return []
}

/**
 * Hitting-specific flag dispatch. Contains all original hitting flags plus the new
 * Bat Casting detection added in Phase 2.2.
 */
function flagHittingMechanics(
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

  // New Phase 2.2: Bat Casting detection
  flags.push(...detectBatCasting(landmarks))

  return flags
}

/**
 * Pitching-specific flag dispatch. Includes shared elbow-slot check and the new
 * Premature Shoulder Opening flag added in Phase 2.2.
 */
function flagPitchingMechanics(
  elbowSlot: number | null,
  shoulderTilt: number | null,
  hipRotation: number | null,
  landmarks: NormalizedLandmark[]
): MechanicsFlag[] {
  const flags: MechanicsFlag[] = []

  // Arm landmark confidence
  const armLandmarks = [12, 14, 16].map(i => landmarks[i]?.visibility ?? 0)
  const armConf = armLandmarks.reduce((s, v) => s + v, 0) / armLandmarks.length

  // Elbow slot check applies to pitching too (arm path during wind-up)
  if (elbowSlot !== null && armConf >= FLAG_CONFIDENCE_THRESHOLD) {
    if (elbowSlot < IDEAL_RANGES.elbowSlot.min) {
      flags.push({
        issue: 'Elbow Drop',
        confidence: armConf,
        severity: 'warning',
        jointIndices: [LANDMARK_INDICES.RIGHT_ELBOW],
      })
    }
  }

  // New Phase 2.2: Premature Shoulder Opening (pitching-specific)
  flags.push(...detectPrematureShoulderOpening(shoulderTilt, hipRotation))

  // Phase 02.3: New pitching-specific flags
  flags.push(...detectArmCircleBentElbow(landmarks))
  flags.push(...detectStrideOffPowerLine(landmarks))

  return flags
}

/**
 * Flags mechanics issues based on computed angles, landmark visibility, and motion type.
 * motionType defaults to 'hitting' — pre-Phase-2.2 callers without this param are unaffected.
 * 'unknown' is treated as 'hitting' for backward compat with videos uploaded before Phase 2.2.
 */
export function flagMechanics(
  elbowSlot: number | null,
  shoulderTilt: number | null,
  hipRotation: number | null,
  landmarks: NormalizedLandmark[],
  motionType: MotionType = 'hitting'
): MechanicsFlag[] {
  if (motionType === 'pitching') {
    return flagPitchingMechanics(elbowSlot, shoulderTilt, hipRotation, landmarks)
  }
  // 'hitting' and 'unknown' both use hitting logic (backward compat)
  return flagHittingMechanics(elbowSlot, shoulderTilt, hipRotation, landmarks)
}
