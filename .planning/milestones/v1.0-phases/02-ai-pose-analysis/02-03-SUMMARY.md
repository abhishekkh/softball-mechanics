---
phase: 02-ai-pose-analysis
plan: 03
subsystem: api
tags: [nextjs, supabase, typescript, route-handler, upsert, rls, service-role]

# Dependency graph
requires:
  - phase: 02-ai-pose-analysis
    plan: 01
    provides: video_analyses and video_analysis_frames tables, AnalysisPayload and FrameRow TypeScript types from src/types/analysis.ts
  - phase: 01-foundation
    provides: service role client pattern, auth pattern with createServerClient + cookies(), videos table with coach_id column

provides:
  - POST /api/analysis route — receives MediaPipe results from browser worker and persists to Supabase
  - Auth validation (401), video ownership enforcement (403), missing video detection (404)
  - Frame upsert with onConflict: video_id,frame_index — safe idempotent re-analysis
  - video_analyses status lifecycle: analyzing -> complete (or low_confidence for 0 frames)

affects:
  - 02-04-PLAN.md (usePoseAnalysis hook calls this route after analysis completes)
  - 02-05-PLAN.md (UI components display analysis status updated by this route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-client pattern: service role client for DB writes (bypass RLS), user auth client for ownership verification"
    - "Upsert with onConflict for idempotent frame persistence — re-analysis cleanly overwrites without duplicate rows"
    - "Status lifecycle via update: analyzing (start) -> complete/low_confidence (end) or error (on failure)"

key-files:
  created:
    - src/app/api/analysis/route.ts
  modified: []

key-decisions:
  - "Service role client used for all DB writes — bypasses RLS needed for video_analyses/video_analysis_frames INSERT/UPDATE"
  - "Set status to 'analyzing' before upsert to prevent race conditions if client calls route twice simultaneously"
  - "low_confidence status returned when frames array is empty — preserves distinction between no-analysis and failed-analysis"

patterns-established:
  - "Dual-client pattern: getAuthUser() uses createServerClient (user JWT verification), getServiceClient() uses createClient with service role key (DB write access)"
  - "Upsert with onConflict string: 'video_id,frame_index' — required comma-separated format for multi-column conflict target"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 2 Plan 03: POST /api/analysis Route Summary

**Next.js route handler persisting MediaPipe frame results to Supabase with dual-client auth pattern (service role for writes, user JWT for ownership) and idempotent upsert on video_id,frame_index**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T23:58:19Z
- **Completed:** 2026-02-27T23:59:58Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created src/app/api/analysis/route.ts with POST handler accepting { videoId, frames[], framingWarning? }
- Implemented full error surface: 401 (unauthenticated), 403 (wrong coach), 404 (missing video), 400 (invalid JSON / missing fields), 500 (DB errors)
- Frame upsert uses onConflict: 'video_id,frame_index' — re-analysis cleanly overwrites prior frame rows without duplicate rows
- video_analyses status lifecycle managed: sets 'analyzing' before upsert, then 'complete' (or 'low_confidence' for 0 frames) on success
- TypeScript compiles clean (npx tsc --noEmit exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /api/analysis route — persist analysis results** - `a9d68ca` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/app/api/analysis/route.ts` — POST route handler bridging browser MediaPipe worker results to Supabase persistence; handles auth, ownership, upsert, and status lifecycle

## Decisions Made

- Service role client used for all DB writes to bypass RLS (video_analyses and video_analysis_frames have no INSERT/UPDATE policy for regular users — only service role)
- Status set to 'analyzing' before upsert prevents race conditions if usePoseAnalysis hook fires the route twice concurrently
- 'low_confidence' returned for empty frames array distinguishes between "analysis ran but detected nothing" vs "analysis never ran"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first attempt.

## User Setup Required

None - no external service configuration required. Route uses existing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars established in Phase 1.

## Next Phase Readiness

- POST /api/analysis is ready for the usePoseAnalysis hook (Plan 04) to call after MediaPipe worker completes
- Route handles all error cases — hook only needs to handle 200 success and non-200 error responses
- Frame upsert is idempotent — hook can safely retry on network failure without data corruption
- No blockers for Phase 2 Plan 04

---
*Phase: 02-ai-pose-analysis*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: src/app/api/analysis/route.ts
- FOUND: .planning/phases/02-ai-pose-analysis/02-03-SUMMARY.md
- FOUND commit a9d68ca (feat(02-03): add POST /api/analysis route to persist MediaPipe results)
