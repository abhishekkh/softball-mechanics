---
phase: 02-ai-pose-analysis
verified: 2026-02-28T00:00:00Z
status: human_needed
score: 14/14 must-haves verified
human_verification:
  - test: "Upload a video and navigate to /review/[videoId] after it is transcoded. Confirm skeleton overlay renders on video frames as the video plays."
    expected: "Green/blue bones and white joint dots appear on top of the video, clearing and redrawing as the playhead moves."
    why_human: "Canvas rendering requires actual MediaPipe model inference running in a browser Web Worker — cannot verify statically."
  - test: "Scrub the video while the skeleton is visible. Confirm hip rotation, elbow slot, and shoulder tilt values in the sidebar update to reflect the current frame."
    expected: "Angle values change as the playhead crosses different sampled frames. Out-of-range values appear amber, in-range values appear green."
    why_human: "Live state update from video timeupdate events requires browser interaction."
  - test: "Click 'Next Flag' in the sidebar. Confirm the video seeks to the next flagged frame and the Mechanics Issues panel updates."
    expected: "Video jumps to the flagged frame. The flag issue label and confidence % appear in the panel."
    why_human: "Prev/Next navigation and seek behavior require live video element interaction."
  - test: "Toggle the Skeleton Overlay switch off. Confirm the canvas overlay disappears."
    expected: "No skeleton bones or dots visible on the video. Toggle switch moves to off state."
    why_human: "Canvas clear/hide behavior requires visual verification."
  - test: "Upload a video filmed facing the camera (not side-on). After analysis completes, confirm a framing warning callout appears in the sidebar."
    expected: "Yellow callout appears in the sidebar reading 'Suboptimal framing: athlete appears to be facing the camera...'"
    why_human: "Requires actual video with non-side-view framing to trigger the hip-separation heuristic."
  - test: "Navigate to the dashboard. Confirm that videos with status 'ready' show a blue 'Review' link."
    expected: "Blue 'Review' button appears beside ready videos. Clicking it navigates to /review/[videoId]."
    why_human: "UI rendering and navigation behavior requires browser verification."
  - test: "Navigate to the upload page. Confirm 'Filming tips for best results' callout appears above the file picker."
    expected: "Blue info box with filming tips visible above the upload file input, including 'Film from the side so hands and bat path are fully visible'."
    why_human: "UI rendering requires browser verification."
---

# Phase 02: AI Pose Analysis — Verification Report

**Phase Goal:** The app automatically extracts softball-specific pose data from uploaded videos so coaches can see a skeleton overlay, joint angles, and flagged mechanics issues on any frame
**Verified:** 2026-02-28
**Status:** human_needed (all automated checks passed — 7 items require browser verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | video_analyses table exists with status/progress_pct columns | VERIFIED | `supabase/migrations/005_video_analyses.sql` line 2: `CREATE TABLE video_analyses` with `status TEXT NOT NULL DEFAULT 'pending'` and `progress_pct INTEGER DEFAULT 0` |
| 2 | video_analysis_frames table exists with JSONB landmarks column and UNIQUE(video_id, frame_index) | VERIFIED | Migration line 17: `CREATE TABLE video_analysis_frames` with `landmarks JSONB NOT NULL` and `UNIQUE(video_id, frame_index)` at line 27 |
| 3 | After transcoding completes, a pending analysis row is auto-inserted | VERIFIED | `src/inngest/functions/transcode-video.ts` line 125: `await step.run('signal-analysis-ready', ...)` inserts `{status: 'pending'}` into `video_analyses` |
| 4 | TypeScript types for FrameAnalysis, MechanicsFlag, and VideoAnalysis exported from src/types/analysis.ts | VERIFIED | `src/types/analysis.ts` exports all 8 required types: `AnalysisStatus`, `NormalizedLandmark`, `MechanicsFlag`, `FrameAngles`, `FrameAnalysis`, `VideoAnalysis`, `AnalysisPayload`, `FrameRow` |
| 5 | angleBetweenThreePoints returns 0–180 degrees; compute* functions return null below visibility 0.65 | VERIFIED | `src/lib/pose/angles.ts`: `angleBetweenThreePoints` uses `Math.acos` clamped to `[-1,1]` returning `[0,180]`; all compute functions check `visibility < VISIBILITY_THRESHOLD (0.65)` and `return null` |
| 6 | flagMechanics returns MechanicsFlag[] with correct issue labels and confidence | VERIFIED | `src/lib/pose/flags.ts` lines 66+: `flagMechanics` returns flags for 'Elbow Drop', 'Elbow Too High', 'Excessive Shoulder Tilt', 'Early Hip Rotation' with `confidence` derived from landmark visibility averages |
| 7 | pose-analyzer.worker.ts initializes PoseLandmarker using local /mediapipe/wasm path | VERIFIED | Worker line 47: `Comlink.expose({ init, detectOnImageBitmap })`. Init uses `FilesetResolver.forVisionTasks('/mediapipe/wasm')`. No `@/` alias imports found in worker file. |
| 8 | drawSkeleton uses ZONE_COLORS — blue for lower body, green for upper body, red for flagged joints | VERIFIED | `src/lib/pose/landmarks.ts` line 10: `ZONE_COLORS = { lower: '#3B82F6', upper: '#10B981', flagged: '#EF4444' }`. `drawSkeleton` at line 41 uses all three. |
| 9 | POST /api/analysis accepts payload and upserts frames with ON CONFLICT | VERIFIED | `src/app/api/analysis/route.ts` line 99: `.upsert(frameRows, { onConflict: 'video_id,frame_index' })`. Status set to 'complete' at line 115. 401/403/404/500 responses all present. |
| 10 | usePoseAnalysis initializes Web Worker, samples video at 5fps, posts results to /api/analysis | VERIFIED | Hook line 92: `new Worker(new URL('@/workers/pose-analyzer.worker.ts', ...))`. Line 210: `fetch('/api/analysis', { method: 'POST', ... })`. `SAMPLE_FPS = 5` at line 14. |
| 11 | Worker is terminated on component unmount; analysis short-circuits when already complete | VERIFIED | `useEffect` cleanup at line 371: `workerRef.current?.terminate()`. `if (status === 'complete' || status === 'low_confidence')` loads stored frames and returns early. |
| 12 | VideoWithOverlay renders stacked canvas over HLS video; drawSkeleton called on timeupdate | VERIFIED | `VideoWithOverlay.tsx` line 8 imports `drawSkeleton`. Line 103: `drawSkeleton(ctx, frameData.landmarks, ...)` called in `handleTimeUpdate`. Canvas positioned `absolute top-0 left-0 pointer-events-none`. |
| 13 | AnalysisTimeline renders colored markers at flagged frame positions | VERIFIED | `AnalysisTimeline.tsx`: filters for `f.flags.length > 0`, renders markers with `bg-red-500` (error) or `bg-yellow-400` (warning). `onClick` calls `onSeek`. |
| 14 | /review/[videoId] page wires all components; dashboard Review link present; upload framing tips present | VERIFIED | `ReviewPageClient.tsx` imports and renders all 4 components. `SessionRow.tsx` line 78: `href={\`/review/${videoId}\`}` when `status === 'ready'`. `UploadPageClient.tsx` line 56: "Filming tips for best results" with "Film from the side..." |

**Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/005_video_analyses.sql` | VERIFIED | Both tables, UNIQUE constraints, indexes, RLS enabled on both |
| `src/types/analysis.ts` | VERIFIED | 8 exports: AnalysisStatus, NormalizedLandmark, MechanicsFlag, FrameAngles, FrameAnalysis, VideoAnalysis, AnalysisPayload, FrameRow |
| `src/inngest/functions/transcode-video.ts` | VERIFIED | Step 6 'signal-analysis-ready' inserts into video_analyses |
| `src/lib/pose/landmarks.ts` | VERIFIED | Exports ZONE_COLORS, LOWER_BODY_INDICES, VISIBILITY_THRESHOLD, LANDMARK_INDICES, drawSkeleton |
| `src/lib/pose/angles.ts` | VERIFIED | Exports angleBetweenThreePoints, computeElbowSlot, computeShoulderTilt, computeHipRotation, computeFrameAngles |
| `src/lib/pose/flags.ts` | VERIFIED | Exports IDEAL_RANGES, FLAG_CONFIDENCE_THRESHOLD, checkFramingQuality, flagMechanics |
| `src/workers/pose-analyzer.worker.ts` | VERIFIED | Comlink.expose({init, detectOnImageBitmap}), no @/ alias imports |
| `public/mediapipe/wasm/` | VERIFIED | 2 .js WASM module files present |
| `public/mediapipe/pose_landmarker_full.task` | VERIFIED | 9.4MB model file present |
| `src/app/api/analysis/route.ts` | VERIFIED | POST handler: auth(401), ownership(403), 404, upsert frames, status→complete |
| `src/hooks/usePoseAnalysis.ts` | VERIFIED | Worker init, 5fps sampling, fetch to /api/analysis, cleanup on unmount, short-circuit on complete |
| `src/components/review/VideoWithOverlay.tsx` | VERIFIED | HLS player + absolute canvas + drawSkeleton on timeupdate + forwardRef |
| `src/components/review/AnalysisTimeline.tsx` | VERIFIED | Flagged markers, red/yellow severity, onSeek on click |
| `src/components/review/MechanicsSidebar.tsx` | VERIFIED | Joint angles, flag panel, Prev/Next, toggle, progress bar, error callout, framing warning, Re-analyze button |
| `src/app/(app)/review/[videoId]/page.tsx` | VERIFIED | Server component fetching video, auth guard, coach ownership check, renders ReviewPageClient |
| `src/components/review/ReviewPageClient.tsx` | VERIFIED | Wires usePoseAnalysis + VideoWithOverlay + MechanicsSidebar + AnalysisTimeline, passes analysisErrorMessage |
| `src/components/dashboard/SessionRow.tsx` | VERIFIED | Review link at /review/${videoId} when status === 'ready' |
| `src/components/upload/UploadPageClient.tsx` | VERIFIED | "Filming tips for best results" callout with "Film from the side..." above VideoUploader |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `transcode-video.ts` | `video_analyses` table | Step 6 'signal-analysis-ready' | WIRED | Line 125 inserts `{status:'pending', progress_pct:0}` |
| `src/types/analysis.ts` | All Phase 2 components/hooks | TypeScript imports | WIRED | Imported by: api/analysis/route.ts, usePoseAnalysis.ts, VideoWithOverlay.tsx, AnalysisTimeline.tsx, MechanicsSidebar.tsx, ReviewPageClient.tsx |
| `pose-analyzer.worker.ts` | MediaPipe PoseLandmarker | Comlink.expose + local /mediapipe/wasm | WIRED | `Comlink.expose({init, detectOnImageBitmap})`, WASM files in public/mediapipe/wasm/ |
| `api/analysis/route.ts` | `video_analysis_frames` | upsert with onConflict | WIRED | Line 99-100 upserts all frame rows |
| `api/analysis/route.ts` | `video_analyses` status update | service role client | WIRED | Sets status='complete' (or 'low_confidence') at line 115 |
| `usePoseAnalysis.ts` | `pose-analyzer.worker.ts` | new Worker(new URL(...)) | WIRED | Line 92: `new URL('@/workers/pose-analyzer.worker.ts', import.meta.url)` |
| `usePoseAnalysis.ts` | `/api/analysis` | fetch POST | WIRED | Line 210: `fetch('/api/analysis', { method: 'POST', ... })` |
| `VideoWithOverlay.tsx` | `src/lib/pose/landmarks.ts` | drawSkeleton import + call | WIRED | Line 8 imports, line 103 calls `drawSkeleton(ctx, frameData.landmarks, ...)` |
| `ReviewPageClient.tsx` | `usePoseAnalysis` + all 4 components | imports + JSX render | WIRED | Lines 4-7 import all; lines 106-136 render all in JSX |
| `SessionRow.tsx` | `/review/[videoId]` | anchor href when status==='ready' | WIRED | Line 78: `href={\`/review/${videoId}\`}` |

---

## Requirements Coverage

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|----------|
| AI-01 | Pose skeleton overlay rendered on video frames using MediaPipe landmarks | 02-01, 02-02, 02-03, 02-04, 02-05 | SATISFIED | `drawSkeleton` in landmarks.ts renders 33-landmark skeleton on canvas overlay in VideoWithOverlay |
| AI-02 | Joint angles automatically computed (hip rotation, elbow slot, shoulder tilt) | 02-01, 02-02, 02-03, 02-04, 02-05 | SATISFIED | `angles.ts` computes all three; stored in DB; displayed live in MechanicsSidebar as video plays |
| AI-03 | AI flags potential mechanics issues with confidence score | 02-01, 02-02, 02-03, 02-04, 02-05 | SATISFIED | `flags.ts` flags 'Elbow Drop', 'Elbow Too High', 'Excessive Shoulder Tilt', 'Early Hip Rotation' with confidence derived from landmark visibility |

All 3 Phase 2 requirements (AI-01, AI-02, AI-03) are SATISFIED. No orphaned requirements.

---

## Anti-Patterns Found

None. All `return null` occurrences in Phase 2 files are legitimate guard clauses:
- `angles.ts`: null returned when landmark visibility < 0.65 (by design — low-confidence data excluded)
- `flags.ts`: null returned from `checkFramingQuality` when hips not visible (acceptable)
- `AnalysisTimeline.tsx` / `ReviewPageClient.tsx`: null returned when frames array is empty (standard early-return guard)

No TODO/FIXME/placeholder comments found in any Phase 2 files. No stub implementations.

---

## Human Verification Required

The following items require browser verification. All automated structural checks passed.

### 1. Skeleton Overlay Renders on Video Frames

**Test:** Upload a softball video, wait for transcoding to complete, navigate to /review/[videoId].
**Expected:** Skeleton bones (green upper body, blue lower body) and white joint dots appear over the video frames as it plays. Red bones appear on joints involved in flagged mechanics.
**Why human:** Canvas rendering requires live MediaPipe WASM inference in a browser Web Worker.

### 2. Joint Angles Update Live as Video Scrubs

**Test:** On the review page, scrub the video while watching the sidebar Joint Angles panel.
**Expected:** Hip Rotation, Elbow Slot, and Shoulder Tilt values update to reflect the nearest sampled frame. Values outside ideal ranges show in amber; in-range values show in green.
**Why human:** Requires live video timeupdate events and real frame data.

### 3. Prev/Next Flag Navigation Seeks Video

**Test:** Click "Next Flag" and "Prev Flag" buttons in the sidebar.
**Expected:** Video seeks to the flagged frame timestamp. The Mechanics Issues panel updates to show that frame's flags with issue label and confidence %.
**Why human:** Requires browser interaction with video element and state.

### 4. Skeleton Toggle Hides/Shows Canvas

**Test:** Click the Skeleton Overlay toggle switch.
**Expected:** Canvas overlay disappears when toggled off; reappears when toggled on. No layout shift.
**Why human:** Visual behavior requires browser verification.

### 5. Framing Warning Appears for Non-Side-View Video

**Test:** Upload a video filmed facing the camera. After analysis completes, check sidebar.
**Expected:** Yellow callout: "Suboptimal framing: athlete appears to be facing the camera rather than side-on."
**Why human:** Requires real video with non-side-view framing to trigger hip-separation heuristic.

### 6. Dashboard Review Link Navigation

**Test:** Go to the dashboard. Look for a ready (transcoded) video.
**Expected:** Blue "Review" button appears beside it. Clicking navigates to /review/[videoId].
**Why human:** UI rendering and navigation require browser verification.

### 7. Upload Page Framing Tips Visible

**Test:** Navigate to the upload page.
**Expected:** Blue "Filming tips for best results" callout with bullet points appears above the file picker area.
**Why human:** UI layout and rendering require browser verification.

---

## Summary

Phase 2 goal is structurally complete. All 14 observable truths verified against actual codebase. All 18 artifact files exist with substantive, non-stub implementations. All 10 key links are wired. All 3 requirements (AI-01, AI-02, AI-03) are satisfied with implementation evidence.

The full chain is intact:
- Transcoding pipeline auto-creates pending analysis rows (Plan 01)
- Pure-function pose engine computes angles and flags mechanics (Plan 02)
- API route persists results to Supabase with upsert idempotency (Plan 03)
- usePoseAnalysis hook orchestrates Worker + persistence + short-circuit (Plan 04)
- Review workspace page wires all components with live sidebar updates (Plan 05)

No stubs, no orphaned artifacts, no blocker anti-patterns. Waiting on human browser verification for 7 visual/interactive behaviors that cannot be verified statically.

---

_Verified: 2026-02-28_
_Verifier: Claude (gsd-verifier)_
