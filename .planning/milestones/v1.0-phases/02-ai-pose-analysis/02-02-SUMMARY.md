---
phase: 02-ai-pose-analysis
plan: "02"
subsystem: ai
tags: [mediapipe, pose-estimation, web-worker, comlink, canvas, biomechanics, typescript]

# Dependency graph
requires:
  - phase: 02-ai-pose-analysis/02-01
    provides: "NormalizedLandmark, MechanicsFlag, FrameAngles TypeScript interfaces in src/types/analysis.ts"

provides:
  - "src/lib/pose/landmarks.ts: ZONE_COLORS, LOWER_BODY_INDICES, LANDMARK_INDICES, VISIBILITY_THRESHOLD, drawSkeleton"
  - "src/lib/pose/angles.ts: angleBetweenThreePoints, computeElbowSlot, computeShoulderTilt, computeHipRotation, computeFrameAngles"
  - "src/lib/pose/flags.ts: IDEAL_RANGES, FLAG_CONFIDENCE_THRESHOLD, checkFramingQuality, flagMechanics"
  - "src/workers/pose-analyzer.worker.ts: Comlink-wrapped MediaPipe PoseLandmarker Web Worker"
  - "public/mediapipe/wasm/: local WASM assets for MediaPipe (no CDN dependency)"
  - "public/mediapipe/pose_landmarker_full.task: float16 model (9MB)"

affects: [02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added:
    - "@mediapipe/tasks-vision ^0.10.32 — PoseLandmarker for 33-keypoint pose estimation"
    - "comlink ^4.4.2 — proxies async function calls across Web Worker boundary"
  patterns:
    - "Pure-function pose library files with no React/Next.js dependencies — importable by hooks and server code"
    - "Web Worker uses only npm package imports (no @/ aliases) — Next.js bundler cannot resolve path aliases in worker context"
    - "Local WASM assets in public/mediapipe/ — avoids CDN dependency at runtime, works in offline/restricted environments"
    - "Visibility guard pattern: null return when any landmark visibility < 0.65 — prevents noisy angle computations on occluded joints"
    - "Confidence-weighted flagging: MechanicsFlag.confidence derived from average joint visibility — downstream UI can filter low-confidence flags"

key-files:
  created:
    - "src/lib/pose/landmarks.ts"
    - "src/lib/pose/angles.ts"
    - "src/lib/pose/flags.ts"
    - "src/workers/pose-analyzer.worker.ts"
    - "public/mediapipe/wasm/vision_wasm_internal.js"
    - "public/mediapipe/wasm/vision_wasm_internal.wasm"
    - "public/mediapipe/wasm/vision_wasm_nosimd_internal.js"
    - "public/mediapipe/wasm/vision_wasm_nosimd_internal.wasm"
    - "public/mediapipe/pose_landmarker_full.task"
  modified:
    - "package.json (added @mediapipe/tasks-vision and comlink)"
    - "package-lock.json"

key-decisions:
  - "Worker imports only npm packages (not @/ aliases) — Next.js bundler cannot resolve path aliases inside Web Worker modules"
  - "MediaPipe initialized from /mediapipe/wasm local path (not CDN) — production-safe, no CDN dependency at analysis time"
  - "runningMode: IMAGE — discrete frame analysis, not continuous video stream; matches per-frame extraction pattern in Plan 03 hook"
  - "GPU delegate with automatic CPU fallback — PoseLandmarker.createFromOptions handles fallback transparently"
  - "IDEAL_RANGES uses wide conservative thresholds (elbowSlot: 70–110 deg) — reduces false positives in v1; coach-validated ranges deferred to v2"
  - "FLAG_CONFIDENCE_THRESHOLD = 0.70 — only flag mechanics when joint visibility >= 70%, filters low-quality frame noise"
  - "drawSkeleton defined inline with hardcoded POSE_CONNECTIONS — avoids importing full @mediapipe/tasks-vision in utility file"
  - "bitmap.close() called immediately after detect() — frees GPU/CPU memory preventing accumulation during per-frame analysis"

patterns-established:
  - "Pose lib pattern: pure functions taking NormalizedLandmark[], returning typed values or null — no side effects, easily testable"
  - "Zone color pattern: blue=lower body, green=upper body, red=flagged — consistent across skeleton drawing and flag UI"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 8min
completed: "2026-02-27"
---

# Phase 2 Plan 02: Pose Analysis Engine Summary

**MediaPipe Web Worker with Comlink, canvas skeleton drawer using ZONE_COLORS, and biomechanics flag rules covering elbow slot, shoulder tilt, and hip rotation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-28T00:34:21Z
- **Completed:** 2026-02-28T00:42:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Three pure-function pose library files (landmarks, angles, flags) with full TypeScript types — no React or Next.js dependencies
- Comlink-wrapped MediaPipe PoseLandmarker Web Worker using local WASM assets, eliminating CDN dependency at runtime
- Canvas skeleton drawing utility with zone-based color coding (blue/green/red) and per-connection visibility gating
- Rule-based mechanics flagging for elbow drop, shoulder tilt, and hip rotation with confidence scoring from joint visibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Pose library — landmarks, angles, and flags** - `4a2d52e` (feat) — prior session
2. **Task 2: MediaPipe Web Worker + install dependencies** - `50a7616` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/pose/landmarks.ts` — ZONE_COLORS, LOWER_BODY_INDICES, LANDMARK_INDICES, VISIBILITY_THRESHOLD, drawSkeleton with POSE_CONNECTIONS
- `src/lib/pose/angles.ts` — angleBetweenThreePoints, computeElbowSlot, computeShoulderTilt, computeHipRotation, computeFrameAngles
- `src/lib/pose/flags.ts` — IDEAL_RANGES, FLAG_CONFIDENCE_THRESHOLD, checkFramingQuality, flagMechanics
- `src/workers/pose-analyzer.worker.ts` — Comlink.expose({ init, detectOnImageBitmap }) over PoseLandmarker
- `public/mediapipe/wasm/vision_wasm_internal.{js,wasm}` — WASM bundle for SIMD-capable devices (~11MB)
- `public/mediapipe/wasm/vision_wasm_nosimd_internal.{js,wasm}` — WASM bundle for older devices (~10MB)
- `public/mediapipe/pose_landmarker_full.task` — float16 MediaPipe model (9MB)
- `package.json` — added @mediapipe/tasks-vision, comlink

## Decisions Made

- Worker file uses only npm package imports (no `@/` path aliases) — Next.js bundler cannot resolve path aliases in Worker module context; pose lib functions will be imported by the hook (Plan 03) instead
- MediaPipe initialized from `/mediapipe/wasm` local path — eliminates CDN dependency, works in production without network calls to storage.googleapis.com
- `runningMode: 'IMAGE'` — discrete frame-by-frame mode matches the per-frame extraction pattern Plan 03 will implement
- WASM files committed to git (not CDN-linked) — required for self-hosted production deployment; Vercel serves public/ directory as static assets
- Conservative IDEAL_RANGES with wide bands — v1 flags only obvious outliers; narrower ranges after coach validation in v2

## Deviations from Plan

None — plan executed exactly as written. All dependencies were already installed in node_modules (package.json entries were missing; git diff confirmed they needed to be added). WASM files were already present in `public/mediapipe/wasm/`; only the model download was needed.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All exports required by Plan 03 hook are available: `computeFrameAngles`, `flagMechanics`, `drawSkeleton`
- Worker is importable via `new Worker(new URL('../workers/pose-analyzer.worker.ts', import.meta.url), { type: 'module' })` + Comlink.wrap
- Blocker from STATE.md still applies: MediaPipe accuracy on softball-specific motions (windmill pitch, full-rotation swing) unverified — validate with real softball video before v1 launch

---
*Phase: 02-ai-pose-analysis*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: src/lib/pose/landmarks.ts
- FOUND: src/lib/pose/angles.ts
- FOUND: src/lib/pose/flags.ts
- FOUND: src/workers/pose-analyzer.worker.ts
- FOUND: public/mediapipe/pose_landmarker_full.task
- FOUND: public/mediapipe/wasm/vision_wasm_internal.js
- FOUND: commit 4a2d52e (pose library)
- FOUND: commit 50a7616 (Web Worker)
- TypeScript: npx tsc --noEmit exits 0
