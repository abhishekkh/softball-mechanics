---
phase: 01-foundation
plan: 08
subsystem: auth, api, ui
tags: [nextjs, middleware, r2, video-upload, presign]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: middleware auth, VideoUploader, presign route from plans 01-02, 01-04, 01-05
provides:
  - Root route '/' now matched by middleware — unauthenticated visits redirect to /login
  - contentType fallback (video/mp4) in VideoUploader for .mov/.mkv/.avi files
  - R2 presign route wrapped in try/catch for structured error response
affects: [02-annotation, UAT-tests-1-9]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit '/' middleware matcher entry as first array item — regex alone misses bare root"
    - "Browser MIME fallback: file.type || 'video/mp4' for video formats browser omits MIME type for"
    - "R2 SDK calls wrapped in try/catch returning structured JSON 500 instead of unhandled exception"

key-files:
  created: []
  modified:
    - src/middleware.ts
    - src/components/upload/VideoUploader.tsx
    - src/app/api/upload/presign/route.ts

key-decisions:
  - "Two-entry matcher array: '/' explicit + existing regex — minimal change, avoids regex rewrite"
  - "Fallback to 'video/mp4' not 'application/octet-stream' — keeps Zod /^video\\// regex passing; mp4 is the most widely-accepted video MIME type in R2"
  - "R2 error caught at presign layer (not lib/r2.ts) — keeps R2 lib generic; route layer owns HTTP response shape"

patterns-established:
  - "Next.js middleware matcher: always include '/' as explicit first entry alongside path-regex entries"
  - "Video upload MIME fallback: apply at the call site (VideoUploader), not in the API route schema"

requirements-completed: [AUTH-01, VID-01]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 1 Plan 8: UAT Gap Closure (Middleware Root Route + Video MIME Fallback) Summary

**Targeted two-file fix closing UAT tests 1 and 9: explicit '/' in middleware matcher and video/mp4 fallback for .mov/.mkv/.avi uploads, plus structured R2 error handling.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T19:56:00Z
- **Completed:** 2026-02-27T20:01:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Middleware now fires on bare '/' — unauthenticated root visits redirect to /login (UAT test 1)
- .mov, .mkv, and .avi uploads no longer fail with 400 — contentType fallback prevents empty MIME string reaching Zod regex (UAT test 9)
- R2 presign errors return a structured JSON 500 instead of an unhandled exception crash

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix middleware matcher to include bare root route** - `7e249bc` (fix)
2. **Task 2: Fix contentType empty-string bug and add R2 error handling** - `50b0852` (fix)

**Plan metadata:** `(pending docs commit)` (docs: complete plan)

## Files Created/Modified
- `src/middleware.ts` - Added `'/'` as first entry in matcher array to catch bare root route
- `src/components/upload/VideoUploader.tsx` - Added `|| 'video/mp4'` fallback on contentType in presign fetch body and XHR Content-Type header
- `src/app/api/upload/presign/route.ts` - Wrapped `getPresignedPutUrl` in try/catch returning structured JSON 500 on R2 failure

## Decisions Made
- Two-entry matcher: `'/'` explicit + existing regex — avoids regex rewrite risk, minimal and surgical change
- Fallback to `'video/mp4'` rather than `'application/octet-stream'` — keeps Zod `/^video\//` regex passing; mp4 is the canonical fallback R2 accepts for video
- R2 error caught at the presign route layer, not inside `lib/r2.ts` — the lib stays generic; HTTP response shaping belongs to the route handler

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build emits a Next.js 16 deprecation warning about `middleware` file convention being renamed to `proxy`, but this is a framework-level rename (not a runtime error) and is out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT tests 1 and 9 are now unblocked for manual verification
- Phase 1 Foundation is fully complete — all 8 plans executed
- Phase 2 (Annotation) can begin once UAT sign-off is received

---
*Phase: 01-foundation*
*Completed: 2026-02-27*

## Self-Check: PASSED
- src/middleware.ts: FOUND
- src/components/upload/VideoUploader.tsx: FOUND
- src/app/api/upload/presign/route.ts: FOUND
- 01-08-SUMMARY.md: FOUND
- Commit 7e249bc (Task 1): FOUND
- Commit 50b0852 (Task 2): FOUND
