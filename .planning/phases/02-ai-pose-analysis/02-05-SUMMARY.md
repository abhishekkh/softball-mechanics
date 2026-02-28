---
phase: 02-ai-pose-analysis
plan: 05
subsystem: ui
tags: [react, next.js, tailwind, pose-analysis, review-workspace]

# Dependency graph
requires:
  - phase: 02-ai-pose-analysis/02-04
    provides: usePoseAnalysis hook, VideoWithOverlay, AnalysisTimeline
  - phase: 02-ai-pose-analysis/02-02
    provides: IDEAL_RANGES from flags.ts, MechanicsFlag types
  - phase: 01-foundation/01-05
    provides: UploadPageClient, SessionRow, dashboard route pattern
provides:
  - MechanicsSidebar with joint angles, flag navigation, error/framing callouts
  - /review/[videoId] server-component route with auth/ownership guards
  - ReviewPageClient wiring all Phase 2 components together
  - Dashboard SessionRow Review link for ready videos
  - Upload page framing guidance callout
affects: [03-annotations, 04-feedback-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component fetches + auth guard + client wrapper for review pages"
    - "useMemo videoRef proxy to bridge forwardRef handle to hook interface"
    - "findFrameAtTime with 300ms tolerance matching HLS seek granularity"
    - "Flag navigation with flagNavIndex state seeking video element directly"

key-files:
  created:
    - src/components/review/MechanicsSidebar.tsx
    - src/app/(app)/review/[videoId]/page.tsx
    - src/components/review/ReviewPageClient.tsx
  modified:
    - src/components/dashboard/SessionRow.tsx
    - src/components/upload/UploadPageClient.tsx

key-decisions:
  - "MechanicsSidebar Joint Angles renders for complete | low_confidence | error status — partial results never suppressed per CONTEXT.md locked decision"
  - "reviewPageClient uses useMemo videoRef proxy to expose overlayRef.current?.videoElement to usePoseAnalysis without changing forwardRef contract"
  - "findFrameAtTime returns null if nearest frame is >300ms away — prevents stale data from showing during video scrubbing"

patterns-established:
  - "Error callout pattern: red bg-red-900/30 border-red-700 text-red-300 above partial content"
  - "Framing warning pattern: amber bg-amber-900/30 border-amber-700 text-amber-300"
  - "Status-gated content: joint angles only render when status is complete/low_confidence/error"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 2 Plan 05: Review Workspace Integration Summary

**MechanicsSidebar + /review/[videoId] workspace page wiring VideoWithOverlay, AnalysisTimeline, and usePoseAnalysis into a complete coach review UI with flag navigation, error callouts, and dashboard/upload entry points**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T00:44:37Z
- **Completed:** 2026-02-28T00:46:42Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Full review workspace at /review/[videoId] accessible only to owning coach on ready videos
- MechanicsSidebar: joint angles with ideal-range coloring, flag panel with Prev/Next navigation, progress bar, error/framing callouts, Re-analyze button
- ReviewPageClient: wires VideoWithOverlay + MechanicsSidebar + AnalysisTimeline + usePoseAnalysis with live time tracking and flag navigation
- Dashboard SessionRow shows "Review" blue button for ready videos linking to /review/[videoId]
- Upload page shows framing guidance tips (film from side, full body, good lighting) above file picker

## Task Commits

Each task was committed atomically:

1. **Task 1: MechanicsSidebar component** - `4a485e4` (feat)
2. **Task 2: /review/[videoId] page, ReviewPageClient, SessionRow Review link** - `4fdc685` (feat)
3. **Task 3: Framing guidance callout on upload page** - `a931fcd` (feat)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified
- `src/components/review/MechanicsSidebar.tsx` - Joint angles display, flag panel, Prev/Next nav, skeleton toggle, error/framing callouts, Re-analyze button
- `src/app/(app)/review/[videoId]/page.tsx` - Server component: auth guard, ownership check, status=ready check, renders ReviewPageClient
- `src/components/review/ReviewPageClient.tsx` - Client workspace: wires VideoWithOverlay + MechanicsSidebar + AnalysisTimeline + usePoseAnalysis
- `src/components/dashboard/SessionRow.tsx` - Added Review link (blue button) for status=ready videos
- `src/components/upload/UploadPageClient.tsx` - Added framing guidance info box above VideoUploader

## Decisions Made
- MechanicsSidebar renders joint angles for `complete | low_confidence | error` status — ensures partial frames collected before an error are still visible to the coach (locked CONTEXT.md decision: "show partial results with a warning — do not hide data")
- `useMemo` videoRef proxy bridges `overlayRef.current?.videoElement` to `usePoseAnalysis` hook without changing VideoWithOverlay's forwardRef contract
- `findFrameAtTime` returns null if nearest frame is >300ms away — prevents stale angle data from displaying during scrubbing between frames

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete: all AI pose analysis components built and wired together
- Coach can upload video → see it transcoded on dashboard → click Review → see live skeleton + joint angles + flag navigation
- Phase 3 (Annotations) can build on /review/[videoId] layout — ReviewPageClient is the natural integration point for annotation tools
- Phase 3 blocker noted in STATE.md: MediaPipe accuracy on softball-specific motions unverified — validate with real video in Phase 3 spike

---
*Phase: 02-ai-pose-analysis*
*Completed: 2026-02-27*
