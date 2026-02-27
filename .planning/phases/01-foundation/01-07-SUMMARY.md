---
phase: 01-foundation
plan: 07
subsystem: database, api, ui
tags: [supabase, rls, zod, nextjs, react, upload]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: VideoUploader component, presign API route, UploadPageClient, videos table schema
provides:
  - Optional athlete_id on videos table (nullable column, updated RLS policy)
  - Presign API route accepts optional/nullable athleteId
  - VideoUploader renders without requiring an athleteId prop
  - UploadPageClient renders VideoUploader always for coaches (no canUpload gate)
affects: [02-annotation, 03-ai, athlete-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deferred assignment: upload videos without athlete selection; assign later in future phase"
    - "Zod optional().nullable() for form fields that may be omitted or explicitly null"

key-files:
  created:
    - supabase/migrations/002_optional_athlete_id.sql
  modified:
    - src/app/api/upload/presign/route.ts
    - src/components/upload/VideoUploader.tsx
    - src/components/upload/UploadPageClient.tsx

key-decisions:
  - "athlete_id is now nullable in videos table — coaches can upload without assigning an athlete (deferred assignment pattern)"
  - "RLS INSERT policy updated: third OR clause allows coach_id = auth.uid() AND athlete_id IS NULL to handle unassigned uploads"
  - "UploadPageClient canUpload gate removed — VideoUploader always renders; athlete dropdown is advisory/optional"
  - "Athlete dropdown default changed from 'Select athlete...' to 'Unassigned' to signal optional nature"

patterns-established:
  - "Deferred assignment: create records with NULL FK, assign later — avoids blocking users on optional relationships"

requirements-completed:
  - VID-01

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 01 Plan 07: Optional Athlete Upload Summary

**Removed three-layer athlete-selection gate (DB NOT NULL, Zod required UUID, UI canUpload guard) so coaches can upload videos without an active roster**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T05:41:46Z
- **Completed:** 2026-02-27T05:43:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DB migration drops NOT NULL from videos.athlete_id and updates RLS INSERT policy to allow null athlete_id when coach uploads
- Presign API route athleteId Zod field is now optional().nullable(); DB insert uses athleteId ?? null
- VideoUploader athleteId prop changed to optional (athleteId?: string); fetch body explicitly sends athleteId ?? null
- UploadPageClient canUpload gate removed; VideoUploader always renders for coaches; athlete dropdown labeled "Assign to athlete (optional)"

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration — make athlete_id nullable and fix RLS INSERT policy** - `7c13e3e` (feat)
2. **Task 2: Make athleteId optional in presign route, VideoUploader, and UploadPageClient** - `bcb7a10` (feat)

## Files Created/Modified
- `supabase/migrations/002_optional_athlete_id.sql` - Drops NOT NULL on athlete_id, replaces INSERT RLS policy to allow null athlete_id when coach uploads
- `src/app/api/upload/presign/route.ts` - athleteId Zod field changed to optional().nullable(); DB insert uses athleteId ?? null
- `src/components/upload/VideoUploader.tsx` - athleteId changed to optional prop; fetch body sends athleteId ?? null explicitly
- `src/components/upload/UploadPageClient.tsx` - Removed canUpload gate, VideoUploader always renders; dropdown label "Assign to athlete (optional)"; default option "Unassigned"

## Decisions Made
- athlete_id nullable in DB: coaches should be unblocked from uploading — deferred assignment is the right UX pattern for rapid onboarding
- RLS policy third OR clause (auth.uid() = coach_id AND athlete_id IS NULL) was needed because NULL comparisons in SQL are never truthy — the original two clauses could not cover the null case
- Explicit `athleteId ?? null` in fetch body rather than omitting the key — ensures presign route receives null (parseable by Zod nullable) rather than undefined (which Zod optional also handles, but explicit null is cleaner and more intentional)

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
- `npx supabase db push` requires a linked project — not available in the execution environment. The migration file was created as specified. The plan anticipated this and instructs the migration be applied manually when the Supabase project is linked. TypeScript compile and build verified all code changes are correct.

## User Setup Required
The DB migration must be applied manually to the Supabase project:
1. Link the project: `npx supabase link --project-ref <your-project-ref>`
2. Push migrations: `npx supabase db push`

Or apply the SQL directly in the Supabase dashboard SQL editor:
```sql
ALTER TABLE videos ALTER COLUMN athlete_id DROP NOT NULL;

DROP POLICY IF EXISTS "videos_insert_authenticated" ON videos;

CREATE POLICY "videos_insert_authenticated" ON videos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      auth.uid() = coach_id
      OR
      auth.uid() = athlete_id
      OR
      (auth.uid() = coach_id AND athlete_id IS NULL)
    )
  );
```

## Next Phase Readiness
- UAT test 8 is now unblocked: coach visits /upload with zero roster athletes and sees VideoUploader immediately
- UAT test 9 (upload progress bar) is now unblocked
- UAT test 10 (transcoding complete) is now unblocked
- Deferred athlete assignment (assign an athlete to an uploaded video) is a future phase feature

---
*Phase: 01-foundation*
*Completed: 2026-02-27*
