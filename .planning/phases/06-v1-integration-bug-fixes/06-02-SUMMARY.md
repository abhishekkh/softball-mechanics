---
phase: 06-v1-integration-bug-fixes
plan: 02
subsystem: email
tags: [resend, email, auth, server-actions, vitest]

# Dependency graph
requires:
  - phase: 02.4-invite-email-and-feedback
    provides: sendFeedbackEmail() server action and inviteAthlete() with branded Resend email
  - phase: 06-v1-integration-bug-fixes
    provides: Plan 01 middleware fix and presign route athlete coach_id fix
provides:
  - sendFeedbackEmail() sends /submissions deep-link (athlete-accessible, no coach auth bounce)
  - inviteAthlete() branded Resend email CTA links to /login (no auth_callback_failed error)
affects: [email delivery, athlete UX, onboarding flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Athlete-accessible links in feedback email point to /submissions, not coach-only /review/:id"
    - "Branded supplementary email CTAs point to /login, not raw Supabase callback URL"

key-files:
  created: []
  modified:
    - src/actions/feedback.ts
    - src/actions/__tests__/feedback.test.ts
    - src/actions/auth.ts

key-decisions:
  - "Feedback email CTA changed from /review/${videoId} to /submissions — athletes fail the coach_id check on review page and get bounced to /dashboard"
  - "Invite email CTA changed from /auth/callback to /login — /auth/callback with no token falls through to redirect /login?error=auth_callback_failed"
  - "Supabase redirectTo and emailRedirectTo values in auth.ts remain unchanged — those carry the real invite tokens and must stay as /auth/callback"

patterns-established:
  - "Pattern: Athlete email CTAs must always point to athlete-accessible routes (/submissions, /login) never coach-only routes (/review/:id, /dashboard)"

requirements-completed: [EMAIL-INVITE-01, EMAIL-FEEDBACK-01]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Phase 06 Plan 02: Email Deep-Link Fixes Summary

**Two broken email deep-links fixed: feedback email now sends athletes to /submissions; invite branded email CTA now links to /login instead of the broken /auth/callback.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-03T17:44:12Z
- **Completed:** 2026-03-03T17:45:32Z
- **Tasks:** 2 of 2 (checkpoint pending human verify)
- **Files modified:** 3

## Accomplishments
- Fixed `sendFeedbackEmail()` submissionsUrl from `/review/${videoId}` to `/submissions` — athletes landing on review page were immediately bounced to `/dashboard` due to `if (video.coach_id !== user.id) redirect('/dashboard')` guard on the review page
- Updated stale test assertion in `feedback.test.ts` to assert `https://example.com/submissions` instead of the old `/review/video-id-with-athlete` URL
- Fixed `inviteAthlete()` branded Resend email `inviteLink` from `/auth/callback` to `/login` — `/auth/callback` with no `code` or `token_hash` params falls through all branches and redirects to `/login?error=auth_callback_failed`
- All 78 Vitest tests pass (full suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix feedback email URL and update stale test** - `e8e21e2` (fix)
2. **Task 2: Fix invite email CTA — change /auth/callback to /login** - `a0e58c1` (fix)

## Files Created/Modified
- `src/actions/feedback.ts` - Changed submissionsUrl to `/submissions` (line 46)
- `src/actions/__tests__/feedback.test.ts` - Updated URL assertion to `/submissions` and test description
- `src/actions/auth.ts` - Changed inviteLink to `/login` in branded Resend email (line 122)

## Decisions Made
- Feedback email CTA changed to `/submissions` because `/review/${videoId}` redirects athletes away — the review page has `if (video.coach_id !== user.id) redirect('/dashboard')` at line 37, and athletes are never the coach
- Invite branded email CTA changed to `/login` — the branded Resend email is supplementary (Supabase's own invite email delivers the real token); a working `/login` page is the correct CTA for athletes
- Supabase `redirectTo` (line 62) and `emailRedirectTo` (line 27, 80) values in `auth.ts` remain unchanged — these carry real authentication tokens and must stay as `/auth/callback`

## Deviations from Plan

None - plan executed exactly as written. All three file changes matched the plan's interface specifications exactly.

## Issues Encountered
- Git staging appeared to fail on first attempt but the files were correctly modified — subsequent status check confirmed the changes were staged properly after git recognized the modifications.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both Phase 06 automated fixes (Plan 01: middleware + presign route; Plan 02: email deep-links) are complete
- Human verification checkpoint pending: confirm landing page loads unauthenticated, /dashboard redirects, feedback email links to /submissions, invite email links to /login
- After checkpoint approval, Phase 06 is fully complete
- All 4 integration bug fixes satisfy: AUTH-02, AUTH-04, VID-01, EMAIL-INVITE-01, EMAIL-FEEDBACK-01

---
*Phase: 06-v1-integration-bug-fixes*
*Completed: 2026-03-03*
