---
phase: 02-ai-pose-analysis
plan: 01
subsystem: database
tags: [supabase, postgres, rls, inngest, typescript, mediapipe, migration]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: videos table schema and RLS patterns, transcodeVideo Inngest function with Steps 1–5, getServiceClient() helper

provides:
  - video_analyses table with status/progress_pct lifecycle tracking and UNIQUE(video_id) constraint
  - video_analysis_frames table with JSONB landmarks and UNIQUE(video_id, frame_index) constraint
  - RLS policies on both new tables (coach/athlete SELECT, service role INSERT/UPDATE)
  - src/types/analysis.ts with all 8 TypeScript type contracts for Phase 2
  - Inngest Step 6 (signal-analysis-ready) — auto-inserts pending analysis row after each successful transcode

affects:
  - 02-02-PLAN.md (browser MediaPipe worker needs video_analyses row to update)
  - 02-03-PLAN.md (API route needs schema + types)
  - 02-04-PLAN.md (React hooks import from src/types/analysis.ts)
  - 02-05-PLAN.md (UI components import VideoAnalysis type)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-fatal Step pattern: Step 6 logs errors but does not throw — transcoding success takes priority over downstream work"
    - "JSONB for schema-flexible data: landmarks (33 points) and flags stored as JSONB; computed angles as typed REAL columns"
    - "UNIQUE constraint enforcement at DB level: UNIQUE(video_id) on video_analyses prevents duplicate analysis rows"

key-files:
  created:
    - supabase/migrations/005_video_analyses.sql
    - src/types/analysis.ts
  modified:
    - src/inngest/functions/transcode-video.ts

key-decisions:
  - "Step 6 is non-fatal: insert failure logs error but does not throw, keeping transcoding idempotent and retryable"
  - "AnalysisStatus type uses string union, not enum — matches Supabase CHECK constraint and avoids runtime enum overhead"
  - "FrameAngles uses number | null (not undefined) — aligns with JSON serialization and nullable DB columns"

patterns-established:
  - "Non-fatal Inngest step: downstream work that should not block primary task uses console.error instead of throw"
  - "Type file pattern: all Phase 2 types live in src/types/analysis.ts — single import source for components, hooks, and API routes"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 2 Plan 01: DB Schema + Types Foundation Summary

**Supabase schema for analysis lifecycle (video_analyses + video_analysis_frames) with TypeScript contracts and auto-pending-row creation wired into Inngest transcode pipeline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T23:53:46Z
- **Completed:** 2026-02-27T23:55:13Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created migration 005_video_analyses.sql with two tables, two indexes, RLS enabled on both, and eight policies covering coach/athlete SELECT and service role INSERT/UPDATE
- Created src/types/analysis.ts exporting all 8 TypeScript contracts (AnalysisStatus, NormalizedLandmark, MechanicsFlag, FrameAngles, FrameAnalysis, VideoAnalysis, AnalysisPayload, FrameRow) — the single import source for all Phase 2 components
- Added Step 6 (signal-analysis-ready) to transcodeVideo Inngest function — auto-inserts {status: pending} into video_analyses after each successful transcode, wiring the pipeline trigger for browser-side MediaPipe analysis

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase migration — video_analyses and video_analysis_frames tables** - `3455ff3` (feat)
2. **Task 2: TypeScript type contracts + Inngest Step 6 wiring** - `c5d09bf` (feat)

## Files Created/Modified

- `supabase/migrations/005_video_analyses.sql` — Two-table schema with UNIQUE constraints, performance indexes, RLS enabled, and 8 policies
- `src/types/analysis.ts` — All Phase 2 TypeScript type contracts; single source of truth for downstream components, hooks, and API routes
- `src/inngest/functions/transcode-video.ts` — Added Step 6 (signal-analysis-ready) inserting pending analysis row post-transcode

## Decisions Made

- Step 6 uses non-fatal error handling: `console.error` instead of `throw` so a failed analysis row insert never causes a transcoding retry
- AnalysisStatus defined as string union type matching the Supabase CHECK constraint exactly — avoids enum mismatch bugs at DB boundary
- JSONB chosen for landmarks and flags columns — schema-flexible storage for 33-point pose arrays and variable-length flag lists; computed angle values stored as typed REAL columns for query efficiency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - migration dry-run passed, TypeScript compiled clean (npx tsc --noEmit exits 0).

## User Setup Required

The migration must be applied to the Supabase database. Run:

```bash
npx supabase db push
```

Or apply `supabase/migrations/005_video_analyses.sql` via the Supabase Dashboard SQL editor.

## Next Phase Readiness

- Schema is in place — Plans 02–05 can reference video_analyses and video_analysis_frames
- All TypeScript types exported from src/types/analysis.ts — ready for import in browser worker (Plan 02), API route (Plan 03), hooks (Plan 04), and UI components (Plan 05)
- Inngest pipeline wired — after any video transcode, a pending analysis row is auto-created to trigger the browser worker flow
- No blockers for Phase 2 Plan 02

---
*Phase: 02-ai-pose-analysis*
*Completed: 2026-02-27*
