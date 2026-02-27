---
phase: 01-foundation
plan: 09
subsystem: auth
tags: [supabase, env, invite, redirect-urls, configuration]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Invite flow with /auth/callback redirectTo using NEXT_PUBLIC_APP_URL
provides:
  - NEXT_PUBLIC_APP_URL set to deployed HTTPS domain in .env.local
  - Supabase dashboard Redirect URLs allowlist updated to include deployed domain
  - UAT test 6 passing — athlete can accept invite and reach /submissions
affects: [invite-flow, auth-callback, athlete-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NEXT_PUBLIC_APP_URL must match the Supabase dashboard Site URL and Redirect URLs allowlist — mismatch causes otp_expired errors"

key-files:
  created: []
  modified:
    - .env.local
    - .env.local.example

key-decisions:
  - "NEXT_PUBLIC_APP_URL set to https://softball-mechanics.vercel.app — must exactly match the Supabase Site URL to prevent OTP rejection on invite email links"
  - ".env.local.example placeholder updated from http://localhost:3000 to https://your-deployed-domain.vercel.app to prevent new developers repeating this mistake"

patterns-established:
  - "Supabase invite email redirect pattern: NEXT_PUBLIC_APP_URL drives redirectTo; Supabase validates redirectTo against dashboard allowlist before sending email — all three must agree"

requirements-completed: [AUTH-02]

# Metrics
duration: 137min
completed: 2026-02-27
---

# Phase 1 Plan 09: Invite Email URL Configuration Summary

**NEXT_PUBLIC_APP_URL updated to deployed HTTPS domain and Supabase dashboard Redirect URLs configured — UAT test 6 (athlete invite acceptance) now passes end-to-end**

## Performance

- **Duration:** 137 min (includes human verification wait for Supabase dashboard manual config + UAT test)
- **Started:** 2026-02-27T20:00:29Z
- **Completed:** 2026-02-27T22:17:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Updated `NEXT_PUBLIC_APP_URL` from `http://localhost:3000` to `https://softball-mechanics.vercel.app` in `.env.local` — Supabase was rejecting invite email redirectTo as not in allowlist because the URL was localhost
- Updated `.env.local.example` placeholder to `https://your-deployed-domain.vercel.app` so new developers understand the deployed domain is required (not localhost)
- User confirmed Supabase dashboard Site URL and Redirect URLs were updated to match the deployed domain — OTP rejection eliminated
- UAT test 6 confirmed passing: athlete received invite email, clicked the link, landed on `/invite/accept`, and was redirected to `/submissions` with no `error=auth_callback_failed` in the URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Update NEXT_PUBLIC_APP_URL in .env.local to deployed domain** - `a0b8d9e` (chore)
2. **Task 2: Supabase dashboard URL config + UAT test 6 verification** - human-verified (no code commit — dashboard configuration only)

**Plan metadata:** `(pending final docs commit)` (docs: complete plan)

## Files Created/Modified

- `.env.local` - `NEXT_PUBLIC_APP_URL` changed from `http://localhost:3000` to `https://softball-mechanics.vercel.app` (gitignored — local only)
- `.env.local.example` - `NEXT_PUBLIC_APP_URL` placeholder updated from `http://localhost:3000` to `https://your-deployed-domain.vercel.app`

## Decisions Made

- `NEXT_PUBLIC_APP_URL` set to `https://softball-mechanics.vercel.app` — this is the deployed Vercel domain that must match the Supabase dashboard Site URL and Redirect URLs allowlist exactly. Any mismatch causes Supabase to invalidate the OTP before the browser reaches `/auth/callback`.
- `.env.local.example` placeholder updated from `http://localhost:3000` to `https://your-deployed-domain.vercel.app` to prevent future developers from repeating this misconfiguration.

## Deviations from Plan

None — plan executed exactly as written. The `.env.local.example` update was explicitly called out in the plan's Task 1 action and was applied as specified.

## Issues Encountered

None during code execution. The Supabase dashboard steps (Site URL + Redirect URLs) are inherently manual — this was anticipated by the plan and handled via the `checkpoint:human-verify` gate. User confirmed success after completing both dashboard steps.

## User Setup Required

The following Supabase dashboard steps were required and confirmed complete by the user:

1. **Site URL** set to `https://softball-mechanics.vercel.app` at: https://supabase.com/dashboard/project/tzkzqtumllirbckuohga/auth/url-configuration
2. **Redirect URLs** allowlist entry added: `https://softball-mechanics.vercel.app/auth/callback`

These are one-time dashboard configurations — no ongoing manual steps required.

## Next Phase Readiness

- All 9 Phase 1 plans complete — Phase 1 Foundation is fully done
- UAT tests 1, 6, and 9 confirmed passing (gaps 1, 2, 3 closed by plans 08 and 09)
- Ready to move to Phase 2: AI Pose Analysis

## Self-Check: PASSED

- FOUND: `.planning/phases/01-foundation/01-09-SUMMARY.md`
- FOUND: `.env.local` (updated locally, gitignored)
- FOUND: `.env.local.example` (updated placeholder committed)
- FOUND: commit `a0b8d9e` (Task 1 — chore(01-09): update NEXT_PUBLIC_APP_URL)
- AUTH-02 already marked complete in REQUIREMENTS.md

---
*Phase: 01-foundation*
*Completed: 2026-02-27*
