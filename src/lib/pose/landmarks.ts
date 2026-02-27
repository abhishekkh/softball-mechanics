// src/lib/pose/landmarks.ts
// MediaPipe PoseLandmarker: 33 landmarks, 0-indexed
// Reference: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

import type { NormalizedLandmark } from '@/types/analysis'

// Zone classification: indices >= 23 are lower body (hips, knees, ankles, feet)
export const LOWER_BODY_INDICES = new Set([23, 24, 25, 26, 27, 28, 29, 30, 31, 32])

export const ZONE_COLORS = {
  lower: '#3B82F6',    // blue — hips, knees, ankles
  upper: '#10B981',    // green — shoulders, elbows, wrists
  flagged: '#EF4444',  // red — joints involved in a mechanics flag
} as const

// Visibility threshold: landmarks below this are excluded from drawing and angle computation
export const VISIBILITY_THRESHOLD = 0.65

// Landmark index reference (RHH — right-handed hitter)
// Mirror to 11/13/15 for left-handed hitter
export const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const

/**
 * Draws the MediaPipe pose skeleton onto a Canvas 2D context.
 * Uses PoseLandmarker.POSE_CONNECTIONS for bone connectivity.
 * Skips landmarks with visibility < VISIBILITY_THRESHOLD.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  flaggedIndices: Set<number> = new Set()
): void {
  if (!landmarks || landmarks.length === 0) return

  const toPixel = (lm: NormalizedLandmark) => ({
    px: lm.x * canvasWidth,
    py: lm.y * canvasHeight,
  })

  // POSE_CONNECTIONS is available on the PoseLandmarker class from @mediapipe/tasks-vision
  // We define the 35 standard connections here to avoid importing the full library in this utility file
  const POSE_CONNECTIONS: [number, number][] = [
    [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
    [9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],
    [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
    [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],
    [27,31],[24,26],[26,28],[28,30],[30,32],[28,32],
  ]

  ctx.lineWidth = 3

  // Draw bones
  for (const [start, end] of POSE_CONNECTIONS) {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b) continue
    if ((a.visibility ?? 1) < VISIBILITY_THRESHOLD || (b.visibility ?? 1) < VISIBILITY_THRESHOLD) continue

    const isFlagged = flaggedIndices.has(start) || flaggedIndices.has(end)
    const isLower = LOWER_BODY_INDICES.has(start) || LOWER_BODY_INDICES.has(end)

    ctx.strokeStyle = isFlagged
      ? ZONE_COLORS.flagged
      : isLower ? ZONE_COLORS.lower : ZONE_COLORS.upper

    const { px: ax, py: ay } = toPixel(a)
    const { px: bx, py: by } = toPixel(b)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // Draw joint dots
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    if ((lm.visibility ?? 1) < VISIBILITY_THRESHOLD) continue
    const { px, py } = toPixel(lm)
    ctx.fillStyle = flaggedIndices.has(i) ? ZONE_COLORS.flagged : '#FFFFFF'
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, 2 * Math.PI)
    ctx.fill()
  }
}
