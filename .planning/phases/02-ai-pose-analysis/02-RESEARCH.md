# Phase 2: AI Pose Analysis - Research

**Researched:** 2026-02-27
**Domain:** MediaPipe Pose Landmarking, Browser-side ML, Canvas Overlay, Inngest Background Jobs
**Confidence:** MEDIUM-HIGH (core stack verified via official docs; sports-specific angle ranges LOW confidence)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Analysis Trigger:**
- Analysis runs automatically after video upload completes (triggered as part of the post-upload pipeline)
- Status indicator shown in the review workspace while analysis is in progress (e.g., "Analyzing… 60%")
- On failure or low confidence: show partial results with a warning — do not hide data
- Re-uploads keep prior analysis; coach can manually trigger re-analysis via a "Re-analyze" button
- Upload page includes framing guidance tips (e.g., "Film from the side so hands and bat path are visible")
- Post-analysis validates video framing quality; if suboptimal (not side-on, hands obscured), shows a warning to the coach in the review workspace

**Skeleton Overlay Style:**
- Full body — all major joints: shoulders, elbows, wrists, hips, knees, ankles, feet
- Color-coded by mechanics zone (e.g., one color for hips/lower body, another for arms/upper body, red for flagged joints)
- Toggle-able: on by default, coach can hide it for clean video viewing
- Updates live on every frame as coach scrubs through the video

**Joint Angle Display:**
- Sidebar panel alongside the video (not on-frame labels)
- Displays the three softball mechanics angles: hip rotation, elbow slot, shoulder tilt
- Each angle shows the measured value alongside the ideal range sourced from softball biomechanics research (e.g., "Hip Rotation: 87° — ideal: 80–100°")
- Sidebar values update live as coach scrubs through frames

**AI Flagging UX:**
- Color-coded markers on the video scrubber timeline at flagged frame positions
- When coach is on a flagged frame: sidebar shows issue label + AI confidence score (e.g., "Elbow Drop — 87% confidence")
- Prev/next flag navigation buttons in the sidebar, in addition to clicking timeline markers directly

### Claude's Discretion
- Exact color scheme for mechanics zones
- Specific biomechanics research source for ideal angle ranges
- Confidence score threshold for what constitutes a "flag" (vs. low-confidence noise)
- Framing validation implementation (model-based or heuristic)
- Exact progress indicator design

### Deferred Ideas (OUT OF SCOPE)
- Benchmark comparison: re-run analysis against a reference/benchmark player and diff pose data — significant capability, its own phase
- Coach-configurable target angle ranges — could be added in Phase 3 or later once coach workflow is established
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Pose skeleton overlay is rendered on video frames using MediaPipe body landmarks | MediaPipe `@mediapipe/tasks-vision` PoseLandmarker in browser; Canvas 2D overlay stacked on HLS video element; run analysis once server-side via Inngest, store landmark JSON per frame in Supabase, render from stored data client-side |
| AI-02 | Joint angles are automatically computed (hip rotation, elbow slot, shoulder tilt) | Angle computed from MediaPipe 33-landmark output using 3-point vector formula (atan2); specific landmark indices for the three angles documented in Code Examples |
| AI-03 | AI flags potential mechanics issues (e.g., "dropping elbow," "early hip rotation") with confidence score | Rule-based flagging against threshold angle ranges + MediaPipe landmark visibility score as proxy for confidence; stored as JSONB in `video_analyses` table per flagged frame |
</phase_requirements>

---

## Summary

Phase 2 adds automated pose analysis to the softball mechanics app. The core challenge is architectural: MediaPipe's JavaScript implementation (`@mediapipe/tasks-vision`) is browser-only — it requires WebGL2 and is not supported in Node.js/Inngest workers. This creates a fundamental decision about where analysis runs.

**Recommended architecture: browser-side analysis on first load.** When a coach opens the review workspace for a newly transcoded video, a Web Worker runs MediaPipe PoseLandmarker against the HLS video frames, computes joint angles, flags mechanics issues, and POSTs results to a `/api/analyze` route that persists them to Supabase. Subsequent views (re-analysis, other coaches) read the cached results from the database — MediaPipe runs only once per video. This sidesteps the Node.js incompatibility entirely and uses compute the client already has (GPU-accelerated WebGL2 in the browser), eliminating server GPU cost.

The existing Inngest pipeline (`video/uploaded` → `transcode-video`) needs a new event (`video/transcoded`) fired at the end of transcription to signal readiness for analysis. The analysis itself happens client-side (not in Inngest), but Inngest status-tracking patterns for the `analyzing` state still apply. MediaPipe `@mediapipe/tasks-vision` v0.10.32 is the current package; the PoseLandmarker model produces 33 body landmarks with normalized coordinates and per-landmark visibility scores. Joint angles are computed client-side via 3-point vector math. Flagging is rule-based thresholding (not a second ML model).

**Primary recommendation:** Run MediaPipe in a browser Web Worker on first coach view, store results in a new `video_analyses` table in Supabase (JSONB per-frame landmark array + computed angles + flags), display from stored data on all subsequent frames.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mediapipe/tasks-vision` | 0.10.32 | Pose landmark detection (33 body points) | Official Google MediaPipe JS Tasks API — replaces legacy `@mediapipe/pose`; browser-only, WebGL2 accelerated |
| `comlink` | ^4.4.1 | Web Worker communication proxy | Eliminates manual postMessage boilerplate; typed RPC over Worker boundary; used in production Next.js + MediaPipe patterns |
| Native Canvas 2D API | (browser built-in) | Skeleton overlay rendering | No library needed — drawLine/arc/fillText is sufficient for joints + bones at video frame rate |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase JSONB | (existing) | Store per-frame landmark data + computed angles | Already in stack; JSONB allows variable-schema frame data while keeping video_id and frame_index as indexed columns |
| `ffmpeg` (existing) | (existing) | Already handles HLS; no new use | Frame extraction not needed — analysis runs against the live HLS video stream in browser |
| Inngest | 3.52.4 (existing) | Status coordination — signal `analyzing` state change | Fires `video/transcoded` event; review page polls status; does NOT run MediaPipe itself |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@mediapipe/tasks-vision` (browser) | Server-side Python MediaPipe | Python MediaPipe is fully Node/server supported and more accurate, but requires a Python microservice and GPU infra. Browser-side avoids all server compute cost and is sufficient for single-person sports video at 30fps |
| `@mediapipe/tasks-vision` (browser) | TensorFlow.js `@tensorflow-models/pose-detection` | TF.js MoveNet is also browser-side, supports NODE.js, but is less accurate than MediaPipe BlazePose for full-body biomechanics; MediaPipe is the current standard for sports apps per multiple sources |
| Browser Web Worker | Inngest + server ffmpeg frame extraction | Server-side extraction + analysis requires ffmpeg JPEG export per frame, then a Node.js WASM MediaPipe port (unsupported / WebGL2 required). Far higher complexity and cost |
| Rule-based flagging | Second ML classifier | A classifier would need labeled softball training data. Rule-based thresholds on computed angles are sufficient for v1 and do not require training data |
| `comlink` | Raw `postMessage` | postMessage works but requires manual serialization protocol. Comlink provides typed proxies at negligible size cost (~7 KB) |

**Installation:**
```bash
npm install @mediapipe/tasks-vision comlink
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── workers/
│   └── pose-analyzer.worker.ts   # MediaPipe PoseLandmarker in Web Worker
├── lib/
│   ├── pose/
│   │   ├── angles.ts              # Joint angle calculation functions
│   │   ├── flags.ts               # Mechanics issue flagging logic + thresholds
│   │   └── landmarks.ts           # Landmark index constants + connection map
│   └── pose-analysis.ts           # Client-side orchestrator (init worker, run, save)
├── components/
│   ├── review/
│   │   ├── VideoWithOverlay.tsx   # HLS video + Canvas stacked overlay
│   │   ├── PoseSkeleton.tsx       # Canvas drawing logic (useImperativeHandle)
│   │   ├── MechanicsSidebar.tsx   # Joint angles + flag display sidebar
│   │   └── AnalysisTimeline.tsx   # Flagged frame markers on scrubber
├── app/
│   └── api/
│       └── analysis/
│           └── route.ts           # POST /api/analysis — saves results to Supabase
└── hooks/
    └── usePoseAnalysis.ts         # Orchestration hook: init worker, analyze, persist
```

### Pattern 1: Stacked Canvas Overlay on HLS Video

**What:** Position a `<canvas>` element absolutely over the `<video>` element, both inside a `position: relative` wrapper. On each frame, clear and redraw skeleton lines and joint dots.

**When to use:** Whenever landmark coordinates come from stored DB data (not real-time inference), which is the case here — analysis ran once, results are cached.

**Example:**
```typescript
// Source: MDN Canvas API + MediaPipe web guide pattern
// VideoWithOverlay.tsx

'use client'
import { useRef, useEffect } from 'react'
import { drawSkeleton } from './PoseSkeleton'
import type { FrameAnalysis } from '@/lib/pose/landmarks'

interface Props {
  hlsUrl: string
  frameAnalyses: FrameAnalysis[]   // pre-loaded from Supabase
  showSkeleton: boolean
  currentFrameIndex: number
}

export function VideoWithOverlay({ hlsUrl, frameAnalyses, showSkeleton, currentFrameIndex }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!showSkeleton) return

    const frameData = frameAnalyses[currentFrameIndex]
    if (frameData) drawSkeleton(ctx, frameData.landmarks, canvas.width, canvas.height)
  }, [currentFrameIndex, showSkeleton, frameAnalyses])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <video ref={videoRef} src={hlsUrl} style={{ display: 'block' }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
```

### Pattern 2: Web Worker with Comlink for MediaPipe

**What:** Run PoseLandmarker initialization and inference inside a Web Worker to avoid blocking the main thread during WASM loading (~2-4 seconds) and per-frame inference.

**When to use:** On first analysis run only. Worker is terminated after results are persisted.

**Example:**
```typescript
// Source: ankdev.me web worker pattern + Comlink Next.js 15 blog (park.is)
// workers/pose-analyzer.worker.ts

import * as Comlink from 'comlink'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let landmarker: PoseLandmarker | null = null

async function init() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
  )
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',   // IMAGE mode for analyzing stored frames
    numPoses: 1,
  })
}

async function detectOnImageBitmap(bitmap: ImageBitmap) {
  if (!landmarker) throw new Error('Landmarker not initialized')
  const result = landmarker.detect(bitmap)
  bitmap.close()  // free memory
  return result
}

Comlink.expose({ init, detectOnImageBitmap })
```

```typescript
// hooks/usePoseAnalysis.ts — main thread side
'use client'
import { useEffect, useRef } from 'react'
import * as Comlink from 'comlink'

export function usePoseAnalysis(videoId: string, hlsUrl: string | null) {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (!hlsUrl) return
    workerRef.current = new Worker(
      new URL('@/workers/pose-analyzer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    const worker = Comlink.wrap<{ init: () => Promise<void>; detectOnImageBitmap: (b: ImageBitmap) => Promise<unknown> }>(workerRef.current)

    // init then analyze frames, POST to /api/analysis
    // ...

    return () => {
      workerRef.current?.terminate()
    }
  }, [videoId, hlsUrl])
}
```

### Pattern 3: Joint Angle Calculation (3-Point Vector Math)

**What:** Compute the angle at joint B given three landmark points A (proximal), B (joint center), C (distal).

**When to use:** For all three softball mechanics angles — use landmark indices from the table below.

**Example:**
```typescript
// Source: MDN Math.atan2 docs + biomechanics research pattern
// lib/pose/angles.ts

interface Point { x: number; y: number }

export function angleBetweenThreePoints(A: Point, B: Point, C: Point): number {
  // Vectors from B to A and B to C
  const BA = { x: A.x - B.x, y: A.y - B.y }
  const BC = { x: C.x - B.x, y: C.y - B.y }

  const dot = BA.x * BC.x + BA.y * BC.y
  const magBA = Math.sqrt(BA.x ** 2 + BA.y ** 2)
  const magBC = Math.sqrt(BC.x ** 2 + BC.y ** 2)

  // Clamp to [-1, 1] to guard against floating point drift past acos domain
  const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return Math.acos(cosTheta) * (180 / Math.PI)
}

// Softball mechanics angle definitions
// Landmark indices (MediaPipe PoseLandmarker standard)
// 11=left_shoulder, 12=right_shoulder, 13=left_elbow, 14=right_elbow
// 15=left_wrist, 16=right_wrist, 23=left_hip, 24=right_hip
// 25=left_knee, 26=right_knee, 27=left_ankle, 28=right_ankle

export function computeElbowSlot(landmarks: {x:number;y:number}[]): number {
  // Angle at elbow — shoulder→elbow→wrist
  return angleBetweenThreePoints(landmarks[12], landmarks[14], landmarks[16])
  // Use right side for RHH; mirrored (11/13/15) for LHH
}

export function computeShoulderTilt(landmarks: {x:number;y:number}[]): number {
  // Shoulder-to-shoulder horizontal tilt relative to ground
  // angle of line 11-12 from horizontal
  const L = landmarks[11]
  const R = landmarks[12]
  return Math.atan2(R.y - L.y, R.x - L.x) * (180 / Math.PI)
}

export function computeHipRotation(landmarks: {x:number;y:number}[]): number {
  // Hip-to-hip angle relative to horizontal — same as shoulder tilt but for hips
  const L = landmarks[23]
  const R = landmarks[24]
  return Math.atan2(R.y - L.y, R.x - L.x) * (180 / Math.PI)
}
```

### Pattern 4: Supabase Schema for Analysis Results

**What:** Store per-frame landmark data as JSONB. Keep video_id + frame_index + timestamp_ms as indexed regular columns for efficient lookup.

```sql
-- supabase/migrations/005_video_analyses.sql
CREATE TABLE video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'complete', 'error', 'low_confidence')),
  progress_pct INTEGER DEFAULT 0,
  frame_count INTEGER,
  analyzed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE video_analysis_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  landmarks JSONB NOT NULL,       -- Array of 33 {x,y,z,visibility} objects
  elbow_slot_deg REAL,
  shoulder_tilt_deg REAL,
  hip_rotation_deg REAL,
  flags JSONB,                    -- Array of {issue, confidence, severity}
  UNIQUE(video_id, frame_index)
);

-- Indexes for fast per-video frame queries
CREATE INDEX idx_vaf_video_id ON video_analysis_frames(video_id);
CREATE INDEX idx_vaf_video_ts ON video_analysis_frames(video_id, timestamp_ms);

-- RLS: same coach/athlete visibility as videos table
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analysis_frames ENABLE ROW LEVEL SECURITY;
```

### Anti-Patterns to Avoid

- **Running MediaPipe in an Inngest function:** MediaPipe requires WebGL2. Inngest runs in Node.js where WebGL2 is unavailable. The library will hang or error silently. Do not attempt this.
- **Running MediaPipe on the main thread:** WASM initialization blocks for 2-4 seconds. Always use a Web Worker.
- **Re-running analysis on every page load:** Analysis runs once and results are persisted. The worker must be gated behind a "no existing analysis" check.
- **Storing 33 landmark objects as separate DB rows per frame:** For a 30-second video at 30fps that is 27,000 rows × 33 = 891,000 rows. Store landmarks as a JSONB array per frame row instead.
- **Burning skeleton into video:** The CONTEXT.md and Phase 1 decisions both specify annotations stored as data, never burned into video. Skeleton is a canvas overlay only.
- **Using `requestAnimationFrame` to drive per-frame inference:** This is a live-camera pattern. Analysis is pre-computed; the frame display just reads from the stored results array by index.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pose body landmark detection | Custom ML model | `@mediapipe/tasks-vision` PoseLandmarker | BlazePose trained on 100K+ images; handles occlusion, 3D depth, 33 landmark tracking out of the box |
| Web Worker message protocol | Custom postMessage serialization | `comlink` | Type-safe, promise-based, 7KB; eliminates manual message dispatch/routing |
| Skeleton connection graph | Custom bone connectivity array | Use `PoseLandmarker.POSE_CONNECTIONS` constant | Built into the library; correct 35-connection map for all 33 landmarks |
| WASM loading and model downloading | Custom fetch + WASM bootstrap | `FilesetResolver.forVisionTasks()` | Handles CDN WASM download, SIMD detection, caching automatically |
| Frame-accurate timestamp syncing | Manual video currentTime math | MediaPipe `detectForVideo(video, timestamp)` timestamp parameter | Library manages temporal coherence between frames when using VIDEO mode |

**Key insight:** The MediaPipe Tasks Vision API handles the hardest parts — WASM lifecycle, GPU delegation, detector-tracker pipeline, temporal smoothing between frames. The application code only needs to: (1) provide image data, (2) read landmark output, (3) compute angles, (4) apply thresholds.

---

## Common Pitfalls

### Pitfall 1: MediaPipe WASM CDN Dependency in Analysis Worker

**What goes wrong:** Worker fetches MediaPipe WASM from `cdn.jsdelivr.net` at analysis time. If the coach is on a slow connection or the CDN is temporarily unavailable, analysis fails silently.

**Why it happens:** `FilesetResolver.forVisionTasks()` downloads WASM bundles at runtime by default.

**How to avoid:** Copy the WASM files and model `.task` file into `/public/mediapipe/` during build or as part of the worker init. Set `FilesetResolver.forVisionTasks('/mediapipe/wasm')` to local path. This adds ~3 MB to the public bundle but eliminates CDN dependency.

**Warning signs:** Analysis works locally, fails intermittently in production Vercel deployments.

### Pitfall 2: Side-View Camera Assumption Violated

**What goes wrong:** MediaPipe was trained on frontal/diagonal view poses. Softball coaches film from the side (required for elbow slot visibility). Side-view can cause limb orientation flipping and landmark dropout, particularly for the far-side arm.

**Why it happens:** When both arms overlap (e.g., during backswing), MediaPipe cannot distinguish near vs. far arm, causing landmark index assignment errors or high-occlusion (low visibility) readings.

**How to avoid:** Always filter landmarks by `visibility > 0.65` before computing angles. Surface per-landmark visibility in the sidebar ("low confidence" badge). The framing validation heuristic should also verify the video is side-on (check if one hip appears significantly closer in Z than the other).

**Warning signs:** Elbow slot angle flips 180° between adjacent frames. Hip rotation value jumps erratically.

### Pitfall 3: "Heavy" Model on Low-Power Devices

**What goes wrong:** Coaches on older MacBooks or iPads experience browser freezes during analysis even with the Web Worker.

**Why it happens:** The "Heavy" PoseLandmarker model is compute-intensive. Even with GPU delegation via WebGL2, per-frame inference can spike to 80-150ms on integrated GPUs.

**How to avoid:** Default to the "Full" model variant. Only offer "Heavy" as an opt-in if coaching on a high-end machine. The "Full" model provides sufficient accuracy for angle computation; "Heavy" is primarily beneficial for 3D depth, which we do not use.

**Warning signs:** Worker postMessage roundtrip exceeds 100ms per frame; browser console shows "GPU process crashed."

### Pitfall 4: Analysis State Race — "Re-analyze" Before Persisting

**What goes wrong:** Coach clicks "Re-analyze" before the prior analysis has finished writing to Supabase. Two workers run concurrently, last-write wins with interleaved frame data.

**Why it happens:** No mutex on the analysis write path.

**How to avoid:** Set `video_analyses.status = 'analyzing'` before starting the worker. Gate "Re-analyze" button behind status check — disabled when `status = 'analyzing'`. Worker aborts on component unmount. Use `upsert` with `ON CONFLICT (video_id, frame_index) DO UPDATE` so re-runs cleanly overwrite.

**Warning signs:** Frame analyses for the same video have inconsistent frame counts.

### Pitfall 5: Next.js Worker Bundling with `type: 'module'`

**What goes wrong:** `new Worker(new URL('@/workers/...', import.meta.url), { type: 'module' })` fails to resolve `@/` alias in the worker bundle.

**Why it happens:** Next.js resolves `@/` alias in the app bundle but the worker file may not have access to the same tsconfig paths resolution inside the worker context.

**How to avoid:** Keep the worker file self-contained with no `@/` alias imports — import only from relative paths or from npm packages. The `pose-analyzer.worker.ts` should import `@mediapipe/tasks-vision` and `comlink` directly (npm packages work fine), but not `@/lib/...`.

**Warning signs:** `Module not found` errors in the browser console that only appear when the worker runs.

---

## Code Examples

Verified patterns from official sources:

### MediaPipe PoseLandmarker Initialization (IMAGE mode for stored video)

```typescript
// Source: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
)

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
    delegate: 'GPU',   // Falls back to CPU automatically if GPU unavailable
  },
  runningMode: 'IMAGE',   // Use IMAGE mode when analyzing discrete frames
  numPoses: 1,            // Single athlete per video
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
})
```

### Detecting Landmarks from a Video Frame

```typescript
// Source: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
// Draw video frame to offscreen canvas, extract ImageBitmap, pass to PoseLandmarker

const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight)
const ctx = offscreen.getContext('2d')!
ctx.drawImage(video, 0, 0)
const bitmap = offscreen.transferToImageBitmap()
const result = poseLandmarker.detect(bitmap)

// result.landmarks[0] = array of 33 NormalizedLandmark {x, y, z, visibility}
// result.worldLandmarks[0] = array of 33 Landmark in metric space
```

### Drawing Skeleton on Canvas

```typescript
// Source: PoseLandmarker.POSE_CONNECTIONS + Canvas 2D API
// lib/pose/landmarks.ts

export const ZONE_COLORS = {
  lower: '#3B82F6',   // blue — hips, knees, ankles
  upper: '#10B981',   // green — shoulders, elbows, wrists
  flagged: '#EF4444', // red — flagged joints
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{x: number; y: number; visibility?: number}>,
  canvasWidth: number,
  canvasHeight: number,
  flaggedIndices: Set<number> = new Set()
) {
  // MediaPipe normalized coords are [0,1]; scale to canvas pixels
  const toPixel = (lm: {x: number; y: number}) => ({
    px: lm.x * canvasWidth,
    py: lm.y * canvasHeight,
  })

  // POSE_CONNECTIONS is exported from @mediapipe/tasks-vision
  // It is an array of [startIdx, endIdx] pairs for all 35 bones
  for (const [start, end] of PoseLandmarker.POSE_CONNECTIONS) {
    const a = landmarks[start]
    const b = landmarks[end]
    if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue

    const isLower = start >= 23 || end >= 23
    ctx.strokeStyle = flaggedIndices.has(start) || flaggedIndices.has(end)
      ? ZONE_COLORS.flagged
      : isLower ? ZONE_COLORS.lower : ZONE_COLORS.upper
    ctx.lineWidth = 3
    ctx.beginPath()
    const { px: ax, py: ay } = toPixel(a)
    const { px: bx, py: by } = toPixel(b)
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // Draw joint circles
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    if ((lm.visibility ?? 1) < 0.5) continue
    const { px, py } = toPixel(lm)
    ctx.fillStyle = flaggedIndices.has(i) ? ZONE_COLORS.flagged : '#FFFFFF'
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, 2 * Math.PI)
    ctx.fill()
  }
}
```

### Mechanics Issue Flagging (Rule-Based)

```typescript
// lib/pose/flags.ts
// Ideal angle ranges sourced from softball biomechanics literature (LOW confidence — validate with coach)
// Sources: PMC11969493 (Biomechanics of Fastpitch Softball Pitching), PMC8739590

export interface MechanicsFlag {
  issue: string
  confidence: number   // 0-1, derived from landmark visibility scores
  severity: 'warning' | 'error'
  jointIndices: number[]
}

export const IDEAL_RANGES = {
  elbowSlot: { min: 70, max: 100 },        // degrees — elbow angle at release/contact
  shoulderTilt: { min: -15, max: 15 },     // degrees from horizontal — negative = glove side down
  hipRotation: { min: 80, max: 100 },      // degrees — hip opening angle at contact
} as const

export function flagMechanics(
  elbowSlot: number,
  shoulderTilt: number,
  hipRotation: number,
  landmarks: Array<{visibility?: number}>,
  visibilityThreshold = 0.65
): MechanicsFlag[] {
  const flags: MechanicsFlag[] = []

  // Average visibility of arm landmarks as confidence proxy
  const armVisibility = [12, 14, 16].map(i => landmarks[i]?.visibility ?? 0)
  const armConf = armVisibility.reduce((s, v) => s + v, 0) / armVisibility.length

  if (elbowSlot < IDEAL_RANGES.elbowSlot.min) {
    flags.push({ issue: 'Elbow Drop', confidence: armConf, severity: 'warning', jointIndices: [14] })
  }
  if (elbowSlot > IDEAL_RANGES.elbowSlot.max) {
    flags.push({ issue: 'Elbow Too High', confidence: armConf, severity: 'warning', jointIndices: [14] })
  }
  if (Math.abs(shoulderTilt) > Math.abs(IDEAL_RANGES.shoulderTilt.max)) {
    flags.push({ issue: 'Shoulder Tilt Excessive', confidence: armConf, severity: 'warning', jointIndices: [11, 12] })
  }
  if (hipRotation < IDEAL_RANGES.hipRotation.min) {
    const hipConf = [23, 24].map(i => landmarks[i]?.visibility ?? 0).reduce((s,v) => s+v, 0) / 2
    flags.push({ issue: 'Early Hip Rotation', confidence: hipConf, severity: 'error', jointIndices: [23, 24] })
  }

  return flags
}
```

### Inngest: Trigger Analysis Status After Transcoding

```typescript
// Source: existing transcode-video.ts pattern + Inngest events docs
// In transcode-video.ts Step 5, after DB update:

await step.run('signal-analysis-ready', async () => {
  const supabase = getServiceClient()
  await supabase.from('video_analyses').insert({
    video_id: videoId,
    status: 'pending',
    progress_pct: 0,
  })
  // Optionally send inngest event if using server-triggered analysis in future
  // await inngest.send({ name: 'video/transcoded', data: { videoId } })
})
```

---

## MediaPipe Landmark Index Reference

| Index | Landmark | Zone | Softball Relevance |
|-------|----------|------|--------------------|
| 11 | left_shoulder | upper | shoulder tilt (left endpoint) |
| 12 | right_shoulder | upper | shoulder tilt (right endpoint), elbow slot proximal |
| 13 | left_elbow | upper | — |
| 14 | right_elbow | upper | elbow slot joint center |
| 15 | left_wrist | upper | — |
| 16 | right_wrist | upper | elbow slot distal |
| 23 | left_hip | lower | hip rotation (left endpoint) |
| 24 | right_hip | lower | hip rotation (right endpoint) |
| 25 | left_knee | lower | — |
| 26 | right_knee | lower | — |
| 27 | left_ankle | lower | — |
| 28 | right_ankle | lower | — |

**Note:** Indices above assume right-handed hitter. For left-handed hitter, mirror: use 11 (left_shoulder), 13 (left_elbow), 15 (left_wrist) for elbow slot.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@mediapipe/pose` (legacy npm) | `@mediapipe/tasks-vision` PoseLandmarker | 2022–2023 | New Tasks API has better TypeScript support, unified model format, FilesetResolver pattern; old package still on npm but unmaintained |
| Real-time webcam-driven inference | Video-frame discrete inference (IMAGE mode) | N/A (design choice) | For stored video analysis, IMAGE mode gives more control over which frames to analyze vs. VIDEO mode's continuous tracking assumption |
| Custom postMessage protocol | Comlink | 2020+ | Standard pattern for typed Worker communication in Next.js 15 per official examples |

**Deprecated/outdated:**
- `@mediapipe/pose`: Still on npm but Google AI Edge docs now point exclusively to `@mediapipe/tasks-vision`. Do not use the legacy package.
- `detectForVideo()` with `performance.now()` timestamps: Appropriate for live camera. For pre-recorded video analysis in IMAGE mode, use `detect()` without timestamps.

---

## Open Questions

1. **Ideal angle ranges for softball hitting vs. pitching**
   - What we know: Elbow flexion ~90°, shoulder abduction ~90° are cited in overhand throwing biomechanics literature (PMC9950989). Fastpitch windmill pitching angles differ substantially from overhand baseball (PMC11969493).
   - What's unclear: The app appears to cover both hitting and pitching. The same angle thresholds may not apply to both motion types. No single authoritative source for "ideal" ranges was found that is sport-and-motion-specific.
   - Recommendation: Use conservative thresholds for v1 (flagging only extreme outliers). Surface ideal ranges as editable in a future phase. Mark ideal ranges with "(Claude's discretion — validate with coach)" comment in code.

2. **Analysis trigger timing — immediately after transcoding vs. on first view**
   - What we know: The CONTEXT.md says analysis runs "automatically after video upload completes (triggered as part of the post-upload pipeline)." This implies server-side or near-immediate trigger.
   - What's unclear: If the trigger is truly post-upload (server-side Inngest), MediaPipe cannot run in Inngest (no WebGL2). The only viable post-upload server-side approach is to flag `video_analyses.status = 'pending'` in Inngest, then let the browser pick up and run MediaPipe when the coach opens the review page.
   - Recommendation: Implement a "pending" status set by Inngest after transcoding + browser-driven analysis on first review page load. The status indicator ("Analyzing...") in the review workspace satisfies the UX requirement even if the analysis runs client-side. This is the architecturally sound solution.

3. **Frame sampling rate for analysis**
   - What we know: A 30-second video at 30fps = 900 frames. Full analysis of all 900 frames would take 15-45 seconds in a Web Worker.
   - What's unclear: Whether 5fps (180 frames, ~6-9s) is sufficient to catch mechanics issues, or whether key-frame analysis (extract 1 frame per 0.1s around identified action phases) is needed.
   - Recommendation: Start with 5fps sampling for v1. MediaPipe in IMAGE mode at 5fps per frame is well within browser capability. The framing guidance tip ("film from side") implies continuous action capture, so 5fps should capture peak positions.

4. **Framing validation heuristic**
   - What we know: CONTEXT.md says framing validation is at Claude's discretion ("model-based or heuristic").
   - What's unclear: Whether a rule-based heuristic (e.g., check that left/right hip X-coordinates are both present and separated by > 10% frame width, indicating side view) is sufficient, or whether a separate ML classifier is needed.
   - Recommendation: Use a heuristic — check hip landmark separation and shoulder visibility. If left and right hip X-coordinates are within 15% of each other (front/back view rather than side), flag as "suboptimal framing." No separate model needed.

---

## Sources

### Primary (HIGH confidence)
- `https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js` — PoseLandmarker Web JS API, running modes, WASM init, detectForVideo vs detect
- `https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker` — 33 landmark index mapping confirmed, model variants (Lite/Full/Heavy)
- `https://github.com/google/mediapipe/issues/5237` — Official MediaPipe team statement: Node.js is NOT a supported runtime; WebGL2 required; CPU delegate only partially mitigates
- `https://park.is/blog_posts/20250417_nextjs_comlink_examples/` — Comlink + Next.js 15 Web Worker pattern, SSR avoidance via useEffect

### Secondary (MEDIUM confidence)
- `https://ankdev.me/blog/how-to-run-mediapipe-task-vision-in-a-web-worker` — Full web worker + MediaPipe pattern with modified importScripts approach; verified alignment with Next.js module worker pattern
- `https://www.it-jim.com/blog/mediapipe-for-sports-apps/` — MediaPipe sports-specific limitations: depth instability, bat interference, side-view tracking fidelity issues
- `https://pmc.ncbi.nlm.nih.gov/articles/PMC11969493/` — Biomechanics of Fastpitch Softball Pitching (PMC, peer-reviewed) — baseline for angle ranges
- `https://pmc.ncbi.nlm.nih.gov/articles/PMC8739590/` — Softball Pitcher Shoulder Stress biomechanics (PMC, peer-reviewed)
- `https://www.inngest.com/docs/guides/multi-step-functions` — Inngest step.run pattern for sequential processing, data passing between steps

### Tertiary (LOW confidence)
- Ideal angle ranges in `flags.ts` (elbow 70-100°, shoulder tilt ±15°, hip rotation 80-100°): Inferred from pitching biomechanics papers above + baseball references; not validated for softball hitting specifically. Must be validated with a coach before shipping.
- `@mediapipe/tasks-vision` current version 0.10.32: From npm search result summary; not directly verified via package page (403 error). Recommend running `npm show @mediapipe/tasks-vision version` to confirm before installing.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — MediaPipe tasks-vision browser-only confirmed via official docs + GitHub issue. Comlink pattern confirmed via Next.js 15 blog.
- Architecture: HIGH — server-side MediaPipe ruled out with official evidence; browser Web Worker pattern confirmed via two independent sources
- Pitfalls: MEDIUM — sports-specific MediaPipe limitations from it-jim blog (credible but single source); WASM CDN dependency verified via setup experience documented in ankdev.me
- Angle ranges / flagging thresholds: LOW — inferred from adjacent sports research, not softball-hitting-specific

**Research date:** 2026-02-27
**Valid until:** 2026-04-15 (MediaPipe Tasks Vision updates frequently; re-verify version before install)
