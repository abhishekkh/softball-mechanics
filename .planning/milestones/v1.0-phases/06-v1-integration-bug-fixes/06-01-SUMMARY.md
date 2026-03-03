---
phase: 06-v1-integration-bug-fixes
plan: 01
subsystem: auth
tags: [middleware, nextjs, supabase, upload, presign, role-based-access, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: middleware auth gating, presign upload route
  - phase: 02.5-review-ux-and-usability-across-devices-security-performance-and-code
    provides: rate limiter in middleware, presign schema design
provides:
  - "Edge-layer auth correctly gates /dashboard, /upload, /review/* for unauthenticated users"
  - "Landing page / remains publicly accessible without login"
  - "Athlete-uploaded videos use the correct coach_id (from request body, not athlete's own user.id)"
  - "Athletes without a linked coach receive 400 from presign route"
affects: ["06-02", "06-03", "auth", "upload", "dashboard"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PUBLIC_PATHS exact-match for '/' entry: p === '/' ? pathname === '/' : pathname.startsWith(p)"
    - "Role-aware resolvedCoachId: athlete trusts client coachId, coach always uses user.id"
    - "vi.hoisted() for Vitest mock refs used in vi.mock factories"
    - "Dynamic import in Vitest tests (await import()) with vi.resetModules() in beforeEach"

key-files:
  created:
    - src/app/api/upload/__tests__/presign.test.ts
  modified:
    - src/middleware.ts
    - src/app/api/upload/presign/route.ts

key-decisions:
  - "Exact-match for '/' in isPublicPath check: startsWith('/'') matched every URL, breaking all auth redirects"
  - "coachId added back to PresignSchema as optional nullable uuid — trusted for athlete role only"
  - "Coach role ignores client-provided coachId for security (always uses user.id)"
  - "400 'Athlete must be linked to a coach before uploading' when athlete role has no coachId"
  - "resolvedCoachId variable introduced to make role-aware logic explicit and auditable"
  - "Zod UUID validation in test data requires RFC 4122 format with version+variant bits — use real UUIDs not all-hex patterns"

patterns-established:
  - "Role check pattern: const role = user.user_metadata?.role ?? 'coach'"
  - "Vitest dynamic import pattern for route handlers: vi.resetModules() + await import() in each test"

requirements-completed: [AUTH-02, AUTH-04, VID-01]

# Metrics
duration: 7min
completed: 2026-03-03
---

# Phase 06 Plan 01: Middleware and Presign Route Bug Fixes Summary

**Fixed middleware PUBLIC_PATHS bypass (all auth redirects were silently skipped) and presign route athlete coach_id misassignment (athlete videos showed up under athlete ID, not coach)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-03T17:44:08Z
- **Completed:** 2026-03-03T17:51:30Z
- **Tasks:** 2 of 2 auto-tasks complete (checkpoint pending human-verify)
- **Files modified:** 3

## Accomplishments

- Fixed `isPublicPath` logic so `'/'` uses exact match — previously `pathname.startsWith('/')` matched ALL paths, making every URL "public" and bypassing the entire auth redirect system
- Fixed presign route to use role-aware `resolvedCoachId`: athletes now use the coach's ID from the request body (already sent by client), coaches always use their own `user.id`
- Added 6 TDD tests for presign route coach_id resolution logic covering all 5 behaviors (401, coach-ignores-body-coachId, athlete-uses-coachId, athlete-null-coachId→400, athlete-missing-coachId→400, schema-accepts-uuid)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix middleware PUBLIC_PATHS — exact-match for '/'** - `55e829b` (fix)
2. **Task 2 RED: Add failing tests for role-aware coach_id** - `822fee0` (test)
3. **Task 2 GREEN: Implement role-aware coach_id in presign route** - `db8e10a` (feat)

**Plan metadata:** (pending — checkpoint not yet approved)

_Note: TDD task produced separate test (RED) and implementation (GREEN) commits_

## Files Created/Modified

- `src/middleware.ts` — Changed `isPublicPath` from plain `startsWith` to conditional: exact match for `'/'`, `startsWith` for all other PUBLIC_PATHS entries
- `src/app/api/upload/presign/route.ts` — Added `coachId` to PresignSchema, added role-aware `resolvedCoachId` logic before DB insert
- `src/app/api/upload/__tests__/presign.test.ts` — Created: 6 tests for presign route role-aware coach_id behavior (TDD)

## Decisions Made

- **Exact-match for '/' only**: The fix is surgical — only `'/'` gets exact matching, all other entries keep `startsWith` behavior. `/login?error=...`, `/invite/accept`, `/api/inngest/webhook` still work correctly.
- **coachId back in PresignSchema**: Phase 02.5 removed `coachId` from schema entirely (correct for coaches). Re-adding it as optional nullable with trust conditional on athlete role is the correct v1 approach.
- **400 for unlinked athletes**: An athlete with no linked coach gets a clear 400 error rather than silently storing wrong data. The upload page already resolves `athleteCoachId` server-side but this is the defense-in-depth API layer.
- **Coach role ignores coachId for security**: Even if a coach sends `coachId` in the body (possibly spoofing), it is ignored and `user.id` is always used. Prevents privilege escalation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TDD test UUIDs rejected by Zod v4 strict UUID validation**
- **Found during:** Task 2 (presign route TDD — GREEN phase)
- **Issue:** Test UUIDs like `'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'` look like valid UUIDs but Zod v4's `.uuid()` validator requires RFC 4122 version bits (third segment must start with `[1-8]`) and variant bits (fourth segment must start with `[89abAB]`). All-same-char UUIDs fail.
- **Fix:** Replaced all test UUIDs with properly formatted RFC 4122 UUIDs (e.g., `'550e8400-e29b-41d4-a716-446655440000'`, `'6ba7b810-9dad-11d1-80b4-00c04fd430c8'`)
- **Files modified:** `src/app/api/upload/__tests__/presign.test.ts`
- **Committed in:** `db8e10a` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test data)
**Impact on plan:** Minor — only affected test data, not implementation. All tests pass.

## Issues Encountered

- Vitest `vi.mock` hoisting with `const` refs: `vi.hoisted()` needed for mock refs referenced inside `vi.mock` factories. Dynamic import (`await import()` with `vi.resetModules()`) pattern required for route handler testing — static import with `vi.mocked()` rewiring in beforeEach did not work reliably.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth redirect gating is now operational — unauthenticated requests to protected routes redirect to `/login`
- Athlete uploads will now correctly attribute videos to the coach's ID
- Human verification required: confirm `/` loads landing page (not redirected), `/dashboard` redirects to `/login` when unauthenticated, `/upload` redirects to `/login` when unauthenticated
- Ready for Plan 02 after checkpoint approval

## Self-Check: PASSED

- FOUND: src/middleware.ts
- FOUND: src/app/api/upload/presign/route.ts
- FOUND: src/app/api/upload/__tests__/presign.test.ts
- FOUND: 06-01-SUMMARY.md
- FOUND: commits 55e829b, 822fee0, db8e10a (all 3 task commits)
- 84/84 tests pass

---
*Phase: 06-v1-integration-bug-fixes*
*Completed: 2026-03-03*
