---
phase: 01-foundation
plan: 05
subsystem: ui
tags: [next.js, supabase, react, tailwind, hls, inngest]

# Dependency graph
requires:
  - phase: 01-03
    provides: auth actions (signUp, signIn, signOut, inviteAthlete), invite acceptance flow
  - phase: 01-04
    provides: VideoUploader, TranscodingStatus, HLSPlayer, presign route, Inngest transcodeVideo

provides:
  - App layout with role-based navigation (coach vs athlete)
  - Coach session queue at /dashboard with SessionRow component
  - Athlete submissions view at /submissions
  - Upload page with athlete assignment dropdown
  - Roster management: RosterList + InviteAthleteModal
  - Roster page at /roster with video counts per athlete

affects:
  - Phase 2 (annotation UI will extend dashboard/submissions views)
  - Phase 3 (AI worker populates data shown in these views)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server components fetch data, pass to client components
    - Role-based redirect at page level (athlete → /submissions, coach → /dashboard)
    - x-user-role header from middleware read in AppLayout for nav rendering
    - Athlete assignment enforced at upload page before VideoUploader renders

key-files:
  created:
    - src/app/(app)/layout.tsx
    - src/app/(app)/dashboard/page.tsx
    - src/app/(app)/submissions/page.tsx
    - src/app/(app)/upload/page.tsx
    - src/app/(app)/roster/page.tsx
    - src/components/dashboard/SessionRow.tsx
    - src/components/upload/UploadPageClient.tsx
    - src/components/roster/RosterList.tsx
    - src/components/roster/InviteAthleteModal.tsx
  modified: []

key-decisions:
  - "Upload page requires athlete selection before enabling VideoUploader — prevents uploads without assignment"
  - "UploadPageClient is a thin client wrapper so UploadPage server component can fetch roster data and pass to client"
  - "RosterList uses plain HTML table for athlete data — no external table library needed at this scale"
  - "InviteAthleteModal catches errors and displays inline — no toast system needed in Phase 1"

patterns-established:
  - "Pattern: Server component fetches, client component renders — used in upload page + roster page"
  - "Pattern: Role guard at page level via user.user_metadata.role + redirect — consistent across dashboard and roster"

requirements-completed: [ROST-01, ROST-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 1 Plan 05: Dashboard, Roster Management, and Upload Wire-up Summary

**Role-scoped views with coach session queue, athlete submissions, roster management with invite modal, and upload page wired to athlete assignment dropdown**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T05:42:25Z
- **Completed:** 2026-02-27T05:44:40Z
- **Tasks:** 2 of 3 auto-tasks complete (Task 3 is human-verify checkpoint — awaiting verification)
- **Files created:** 9

## Accomplishments
- App layout with role-based nav reads `x-user-role` header set by middleware — coaches see Dashboard/Upload/Roster, athletes see My Submissions/Upload
- Coach dashboard at `/dashboard` queries videos with `coach_id = user.id` ordered by upload date, renders SessionRow with live TranscodingStatus badge
- Athlete submissions at `/submissions` queries videos with `athlete_id = user.id`, shows empty state with upload CTA
- Upload page fetches active athletes for coach dropdown; athletes get athleteId pre-filled — VideoUploader only renders once athlete is selected
- RosterList renders athlete table with name, status badge (Active/Invite sent), video count, and invite date
- InviteAthleteModal calls `inviteAthlete` server action and shows success or error state inline
- `npm run build` exits 0 with all 13 routes generated

## Task Commits

Each task was committed atomically:

1. **Task 1: App layout, coach dashboard, athlete submissions, upload page, SessionRow** - `22a9148` (feat)
2. **Task 2: Roster management — RosterList, InviteAthleteModal, roster page** - `b6d664b` (feat)
3. **Task 3: End-to-end Phase 1 verification** - CHECKPOINT: awaiting human verification

## Files Created/Modified
- `src/app/(app)/layout.tsx` - Authenticated app layout, reads x-user-role for nav
- `src/app/(app)/dashboard/page.tsx` - Coach session queue, videos joined with profiles, coach_id guard
- `src/app/(app)/submissions/page.tsx` - Athlete submissions, athlete_id filter
- `src/app/(app)/upload/page.tsx` - Server component fetches active athletes, passes to client
- `src/app/(app)/roster/page.tsx` - Coach roster page with video counts, athlete-redirect guard
- `src/components/dashboard/SessionRow.tsx` - Thumbnail, athlete name, date, TranscodingStatus badge
- `src/components/upload/UploadPageClient.tsx` - Client wrapper with athlete dropdown + VideoUploader
- `src/components/roster/RosterList.tsx` - Athlete table with status badges and video counts
- `src/components/roster/InviteAthleteModal.tsx` - Invite modal calling inviteAthlete server action

## Decisions Made
- Upload page requires athlete selection before enabling VideoUploader — prevents uploads without assignment
- UploadPageClient is a thin client wrapper so UploadPage server component can fetch roster data and pass to client
- RosterList uses plain HTML table — no external table library needed at this scale
- InviteAthleteModal catches errors and displays inline — no toast system needed in Phase 1

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None — all TypeScript compiled clean, `npm run build` exits 0 on first attempt.

## Checkpoint: End-to-end Phase 1 Verification (Task 3)

**Status:** AWAITING HUMAN VERIFICATION

This plan includes a blocking `checkpoint:human-verify` for full end-to-end flow testing:

**Pre-flight:** Ensure `.env.local` has all values from `.env.local.example`.

**Run:** `npm run dev`

**Flows to verify:**
1. Coach signup → `/dashboard` with empty state and "Invite athlete" CTA
2. Invite athlete by email → invite email received → invite link clicked → athlete lands on `/submissions`
3. Coach uploads video with athlete selected → progress bar → Processing → Ready status on dashboard
4. Role separation: athlete visiting `/dashboard` redirected to `/submissions`
5. Mobile upload: "Select videos to upload" button shown on mobile (no capture attribute)

**Resume signal:** Type "approved" if full flow works, or describe issues found.

## Next Phase Readiness
- All Phase 1 UI complete: auth, invite, upload, transcoding, dashboard, submissions, roster
- Phase 2 (annotation) can extend dashboard and submissions views with annotation UI
- Awaiting human verification confirmation before Phase 2 begins

---
*Phase: 01-foundation*
*Completed: 2026-02-27*

## Self-Check: PASSED

All created files verified on disk:
- FOUND: src/app/(app)/layout.tsx
- FOUND: src/app/(app)/dashboard/page.tsx
- FOUND: src/app/(app)/submissions/page.tsx
- FOUND: src/app/(app)/upload/page.tsx
- FOUND: src/app/(app)/roster/page.tsx
- FOUND: src/components/dashboard/SessionRow.tsx
- FOUND: src/components/upload/UploadPageClient.tsx
- FOUND: src/components/roster/RosterList.tsx
- FOUND: src/components/roster/InviteAthleteModal.tsx
- FOUND: .planning/phases/01-foundation/01-05-SUMMARY.md

Commits verified:
- 22a9148: feat(01-05): app layout, coach dashboard, athlete submissions, and upload page
- b6d664b: feat(01-05): roster management — RosterList, InviteAthleteModal, roster page
