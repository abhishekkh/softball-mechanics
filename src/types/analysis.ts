// src/types/analysis.ts
// Type contracts for Phase 2 AI pose analysis
// All downstream components, hooks, and API routes import from here

export type AnalysisStatus = 'pending' | 'analyzing' | 'complete' | 'error' | 'low_confidence'

export interface NormalizedLandmark {
  x: number
  y: number
  z: number
  visibility: number
}

export interface MechanicsFlag {
  issue: string
  confidence: number     // 0–1, derived from landmark visibility
  severity: 'warning' | 'error'
  jointIndices: number[]
}

export interface FrameAngles {
  elbowSlotDeg: number | null      // null when landmark visibility < 0.65
  shoulderTiltDeg: number | null
  hipRotationDeg: number | null
}

export interface FrameAnalysis {
  frameIndex: number
  timestampMs: number
  landmarks: NormalizedLandmark[]  // 33 MediaPipe body landmarks
  angles: FrameAngles
  flags: MechanicsFlag[]
  isContact?: boolean  // True on the estimated ball-contact frame (peak hip rotation)
}

export interface VideoAnalysis {
  id: string
  videoId: string
  status: AnalysisStatus
  progressPct: number
  frameCount: number | null
  analyzedAt: string | null
  errorMessage: string | null
  framingWarning: string | null
  createdAt: string
}

// Shape returned by POST /api/analysis request body
export interface AnalysisPayload {
  videoId: string
  frames: FrameAnalysis[]
  framingWarning?: string
}

// Shape for upsert into video_analysis_frames
export interface FrameRow {
  video_id: string
  frame_index: number
  timestamp_ms: number
  landmarks: NormalizedLandmark[]
  elbow_slot_deg: number | null
  shoulder_tilt_deg: number | null
  hip_rotation_deg: number | null
  flags: MechanicsFlag[]
}
