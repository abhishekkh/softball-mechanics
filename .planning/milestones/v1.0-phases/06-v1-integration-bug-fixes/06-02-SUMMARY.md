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
  - sendFeedbackEmail() sends magic link that auto-authenticates athlete and lands on /submissions
  - inviteAthlete() branded Resend email CTA embeds real generateLink() action_link (no auth bounce)
affects: [email delivery, athlete UX, onboarding flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Athlete-accessible links in feedback email use admin.auth.admin.generateLink(magiclink) for auto-login to /submissions"
    - "Invite emails use generateLink(invite) for new users and generateLink(magiclink) for existing users — real action_link embedded in branded email"
    - "No implicitClient or signInWithOtp needed — admin generateLink() returns action_link directly"

key-files:
  created: []
  modified:
    - src/actions/feedback.ts
    - src/actions/__tests__/feedback.test.ts
    - src/actions/auth.ts

key-decisions:
  - "Feedback email CTA changed from /review/${videoId} to /submissions — athletes fail the coach_id check on review page and get bounced to /dashboard"
  - "Invite email CTA changed from /auth/callback to /login — /auth/callback with no token falls through to redirect /login?error=auth_callback_failed"
  - "Post-checkpoint: feedback email upgraded to embed magic link (generateLink magiclink) so clicking auto-authenticates — static /login was broken for unauthenticated athletes"
  - "Post-checkpoint: inviteAthlete() replaced inviteUserByEmail + signInWithOtp with generateLink(invite/magiclink) — gets real action_link to embed in branded email; Supabase no longer sends a parallel email"
  - "Post-checkpoint: implicitClient with PKCE bypass removed — generateLink admin API returns action_link directly without needing a separate OTP flow"

patterns-established:
  - "Pattern: Athlete email CTAs must use admin generateLink() to embed a real action_link, never a static /login URL that requires pre-existing session"
  - "Pattern: New athlete = generateLink(invite); returning athlete = generateLink(magiclink); both return action_link for embedding"

requirements-completed: [EMAIL-INVITE-01, EMAIL-FEEDBACK-01]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Phase 06 Plan 02: Email Deep-Link Fixes Summary

**Email auth UX fully fixed: feedback email embeds a magic link that auto-authenticates athletes and lands them on /submissions; invite email embeds the real Supabase action_link (via generateLink) so new and returning athletes can access their account without manually logging in.**

## Performance

- **Duration:** ~10 min (including post-checkpoint continuation)
- **Started:** 2026-03-03T17:44:12Z
- **Completed:** 2026-03-03T18:17:00Z (post-checkpoint)
- **Tasks:** 4 of 4 (including 2 post-checkpoint tasks A, B, C)
- **Files modified:** 3

## Accomplishments

### Initial tasks (pre-checkpoint)
- Fixed `sendFeedbackEmail()` submissionsUrl from `/review/${videoId}` to `/submissions` — athletes landing on review page were immediately bounced to `/dashboard` due to `if (video.coach_id !== user.id) redirect('/dashboard')` guard on the review page
- Updated stale test assertion in `feedback.test.ts` to assert `https://example.com/submissions` instead of the old `/review/video-id-with-athlete` URL
- Fixed `inviteAthlete()` branded Resend email `inviteLink` from `/auth/callback` to `/login` — `/auth/callback` with no `code` or `token_hash` params falls through all branches and redirects to `/login?error=auth_callback_failed`

### Post-checkpoint tasks (Task A, B, C — reported issues)
- **Task A:** `feedback.ts` now calls `admin.auth.admin.generateLink({ type: 'magiclink' })` after fetching athlete email; `ctaUrl` is the returned `action_link` (fallback to `/submissions`); `redirectTo` points to `/auth/callback?next=/submissions` so the `/auth/callback` route correctly lands athletes on `/submissions` post-auth
- **Task B:** `inviteAthlete()` replaced `inviteUserByEmail` + `signInWithOtp` (implicit client PKCE bypass) with `admin.auth.admin.generateLink({ type: 'invite' })` for new users and `generateLink({ type: 'magiclink' })` for existing users (422/already-registered); `authLink` is the real `action_link` embedded in the branded email; button text is context-aware: "Accept Invite & Get Started" vs "View Your Analysis"
- **Task C:** `feedback.test.ts` mocks `@supabase/supabase-js` with `mockGenerateLink` returning a test `action_link`; `beforeEach` resets and seeds the mock; URL assertion updated to verify magic link URL appears in email HTML; test description updated
- All 84 Vitest tests pass (full suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix feedback email URL and update stale test** - `e8e21e2` (fix)
2. **Task 2: Fix invite email CTA — change /auth/callback to /login** - `a0e58c1` (fix)
3. **Task A+C: Feedback email magic link + test mock** - `0311210` (fix+test)
4. **Task B: Invite email generateLink() embed** - `9404d51` (fix)

## Files Created/Modified
- `src/actions/feedback.ts` - Added admin client import; generateLink(magiclink) call; ctaUrl replaces submissionsUrl in HTML href
- `src/actions/__tests__/feedback.test.ts` - Mock for @supabase/supabase-js admin.generateLink; mockReset in beforeEach; updated URL assertion and test description
- `src/actions/auth.ts` - Replaced inviteUserByEmail + implicitClient/signInWithOtp with generateLink(invite/magiclink); authLink embedded in CTA href; dynamic button text

## Decisions Made
- Feedback email CTA changed to `/submissions` because `/review/${videoId}` redirects athletes away
- Post-checkpoint: Feedback email further upgraded to embed magic link — static `/submissions` required prior login; magic link auto-authenticates then redirects via `/auth/callback?next=/submissions`
- Invite email: `generateLink(invite)` replaces `inviteUserByEmail` — gets `action_link` directly so branded email can embed the real Supabase auth URL; Supabase no longer sends a parallel system email
- Existing athletes: `generateLink(magiclink)` instead of `signInWithOtp` via implicit client — eliminates the PKCE bypass hack and returns a usable `action_link`
- Button text is dynamic: new users see "Accept Invite & Get Started"; returning users see "View Your Analysis"

## Deviations from Plan

None in original tasks. Post-checkpoint continuation added Tasks A, B, C based on user-reported verification issues (auth gate forcing login). These were continuation tasks, not deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 06 Plan 02 is fully complete including post-checkpoint auth UX improvements
- All integration bug fixes satisfy: AUTH-02, AUTH-04, VID-01, EMAIL-INVITE-01, EMAIL-FEEDBACK-01

---
*Phase: 06-v1-integration-bug-fixes*
*Completed: 2026-03-03*
