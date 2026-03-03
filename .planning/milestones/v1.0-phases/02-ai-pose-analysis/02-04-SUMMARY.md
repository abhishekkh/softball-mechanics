---
phase: 02-ai-pose-analysis
plan: 04
subsystem: ui
tags: [react, hooks, mediapipe, hls, canvas, comlink, web-worker, supabase, typescript]

# Dependency graph
requires:
  - phase: 02-ai-pose-analysis
    plan: 01
    provides: video_analyses and video_analysis_frames tables, AnalysisStatus/FrameAnalysis/NormalizedLandmark types from src/types/analysis.ts
  - phase: 02-ai-pose-analysis
    plan: 02
    provides: pose-analyzer.worker.ts (Comlink-wrapped MediaPipe worker), drawSkeleton/computeFrameAngles/flagMechanics/checkFramingQuality from src/lib/pose/
  - phase: 02-ai-pose-analysis
    plan: 03
    provides: POST /api/analysis route for persisting MediaPipe results

provides:
  - usePoseAnalysis hook — Web Worker orchestration, frame sampling at 5fps, MediaPipe analysis, POST /api/analysis persistence, progress reporting
  - VideoWithOverlay component — HLS video with stacked canvas skeleton overlay (forwardRef)
  - AnalysisTimeline component — colored flag markers on scrubber timeline

affects:
  - 02-05-PLAN.md (MechanicsSidebar and review page wire usePoseAnalysis, VideoWithOverlay, AnalysisTimeline together)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "usePoseAnalysis short-circuit: checks DB status on mount — loads stored frames if complete/low_confidence, skips Worker entirely"
    - "Partial data pattern: on status=error, loads stored frames AND sets analysisErrorMessage — data never hidden from coach"
    - "Worker lifecycle: init on mount, terminate in useEffect cleanup via abortRef + workerRef.current.terminate()"
    - "Canvas overlay: absolutely positioned canvas stacked over HLS video; redraws skeleton on every timeupdate event"
    - "findNearestFrame: linear scan with 300ms tolerance — matches 5fps frame to current video position"

key-files:
  created:
    - src/hooks/usePoseAnalysis.ts
    - src/components/review/VideoWithOverlay.tsx
    - src/components/review/AnalysisTimeline.tsx
  modified: []

key-decisions:
  - "analysisErrorMessage exposed as string|null — non-null when status=error; Plan 05 MechanicsSidebar must render error callout above partial frames"
  - "findNearestFrame uses 300ms tolerance (1.5 frames at 5fps) — matches HLS seek granularity to sampled frame grid"
  - "buildFrameMap utility removed — findNearestFrame linear scan is correct for 5fps sample rate (≤150 frames for 30s video)"

patterns-established:
  - "Error-state partial data: loadStoredFrames() + setAnalysisErrorMessage() always called together on status=error — never suppress partial results"
  - "forwardRef with VideoWithOverlayHandle exposes videoElement for usePoseAnalysis videoRef binding in Plan 05"

requirements-completed: [AI-01, AI-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 2 Plan 04: usePoseAnalysis Hook and Display Components Summary

**usePoseAnalysis orchestration hook with Web Worker frame sampling, partial-data error recovery, and VideoWithOverlay/AnalysisTimeline display components for the review page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T00:39:59Z
- **Completed:** 2026-02-28T00:41:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created usePoseAnalysis hook: Web Worker init via Comlink, 5fps frame sampling with seek+OffscreenCanvas, short-circuits on complete/low_confidence, loads partial frames + sets analysisErrorMessage on error status
- Created VideoWithOverlay: HLS player (hls.js + Safari native fallback) with absolutely positioned canvas overlay; skeleton redrawn on every timeupdate event using findNearestFrame with 300ms tolerance
- Created AnalysisTimeline: flagged frame markers on scrubber — red (bg-red-500) for severity:error, yellow (bg-yellow-400) for severity:warning; clicking seeks video to frame
- TypeScript compiles clean on first attempt (npx tsc --noEmit exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: usePoseAnalysis hook — Web Worker orchestration and frame sampling** - `ff69f6e` (feat)
2. **Task 2: VideoWithOverlay and AnalysisTimeline components** - `b0cbbfc` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/hooks/usePoseAnalysis.ts` — Orchestration hook: DB status check on mount, Worker init, 5fps frame sampling, angle/flag computation, POST /api/analysis persistence, startReanalysis() reset
- `src/components/review/VideoWithOverlay.tsx` — HLS video + canvas skeleton overlay with forwardRef exposing videoElement for hook binding
- `src/components/review/AnalysisTimeline.tsx` — Flagged frame markers on scrubber; red for error severity, yellow for warning; onSeek callback on click

## Decisions Made

- `analysisErrorMessage: string | null` added to hook return type — Plan 05 MechanicsSidebar must render a visible error callout when non-null (above any partial frames), per CONTEXT.md decision "show partial results with a warning — do not hide data"
- Removed unused `buildFrameMap` utility function — the linear-scan `findNearestFrame` with 300ms tolerance is correct for 5fps (max ~150 frames for 30s video); O(1) lookup not needed at this scale
- Canvas overlay synced to video dimensions on `loadedmetadata` event — ensures correct pixel mapping for normalized landmark coordinates (0-1 range)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first attempt.

## User Setup Required

None - no external service configuration required. Hook uses existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and /api/analysis route from Plan 03.

## Next Phase Readiness

- usePoseAnalysis is ready for Plan 05 to wire into the review page via `<VideoWithOverlay ref={overlayRef}>` and `usePoseAnalysis(videoId, overlayRef.videoElement)`
- VideoWithOverlay exposes `videoElement` via `VideoWithOverlayHandle` — Plan 05 binds this to usePoseAnalysis videoRef
- AnalysisTimeline receives frames/videoDurationSec/currentTimeSec/onSeek — Plan 05 provides these from VideoWithOverlay onTimeUpdate callback
- No blockers for Phase 2 Plan 05

---
*Phase: 02-ai-pose-analysis*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: src/hooks/usePoseAnalysis.ts
- FOUND: src/components/review/VideoWithOverlay.tsx
- FOUND: src/components/review/AnalysisTimeline.tsx
- FOUND commit ff69f6e (feat(02-04): add usePoseAnalysis orchestration hook)
- FOUND commit b0cbbfc (feat(02-04): add VideoWithOverlay and AnalysisTimeline components)
