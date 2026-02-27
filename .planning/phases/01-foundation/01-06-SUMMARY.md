---
phase: 01-foundation
plan: 06
subsystem: auth
tags: [supabase, invite, pkce, server-actions, coach-athletes]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "inviteAthlete server action, /auth/callback route, middleware PUBLIC_PATHS"
provides:
  - "PKCE-compatible invite acceptance flow from email link to /submissions"
  - "acceptInvite server action using admin client to bypass RLS on coach_athletes"
  - "/invite/accept page that activates athlete after session is established"
  - "/auth/callback honors ?next= param for explicit routing overrides"
affects: [auth, invite-flow, athlete-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "?next= query param on /auth/callback for post-auth routing overrides"
    - "Server action with admin client to bypass RLS for cross-user table updates"
    - "Client page calls server action on mount then router.replace to prevent back-navigation"

key-files:
  created:
    - src/app/invite/accept/page.tsx
  modified:
    - src/actions/auth.ts
    - src/app/auth/callback/route.ts

key-decisions:
  - "acceptInvite uses admin client (service role) to update coach_athletes — RLS policy restricts update to coach_id owner, athlete is not the coach"
  - "/auth/callback routes to ?next= value when present and starts with '/' — normal login flows unchanged (role-based redirect when no ?next=)"
  - "router.replace not router.push on /invite/accept — prevents athlete from back-navigating to acceptance page after redirect"

patterns-established:
  - "Post-auth routing override: pass ?next=/path to /auth/callback in redirectTo for PKCE invite flows"
  - "Admin client pattern for cross-user writes: use getAdminClient() in server action when RLS blocks legitimate cross-user updates"

requirements-completed: [AUTH-02, AUTH-03]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 1 Plan 6: Invite Acceptance Flow Summary

**PKCE-compatible athlete invite flow stitched end-to-end: inviteAthlete redirectTo updated, /auth/callback honors ?next= routing, and new /invite/accept page activates athlete via admin-client server action before redirecting to /submissions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T16:21:44Z
- **Completed:** 2026-02-27T16:23:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed broken invite redirect chain: inviteAthlete now sends athlete to `/auth/callback?next=/invite/accept` instead of just `/auth/callback`
- /auth/callback now routes to `?next=` value when present (internal path starting with `/`) — normal login flows unaffected
- New `/invite/accept` page reads already-established PKCE session, calls `acceptInvite()` server action to activate athlete, then `router.replace('/submissions')`
- `acceptInvite()` uses admin client (service role) to bypass RLS policy that restricts coach_athletes updates to coach owners

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix inviteAthlete redirectTo and honor ?next= in /auth/callback** - `3b0d76c` (fix)
2. **Task 2: Add acceptInvite server action and /invite/accept page** - `c83ad62` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/actions/auth.ts` - Updated `inviteAthlete` redirectTo to include `?next=/invite/accept`; added `acceptInvite()` server action using admin client
- `src/app/auth/callback/route.ts` - Now checks `?next=` param first; falls through to role-based redirect only when absent or '/'
- `src/app/invite/accept/page.tsx` - New 'use client' page: calls `acceptInvite()` on mount, routes to /submissions on success, /login if unauthenticated

## Decisions Made
- `acceptInvite()` uses admin client because RLS policy `coach_athletes_update_coach` restricts updates to `WHERE coach_id = auth.uid()` — the athlete is not the coach, so service role is required
- `router.replace` instead of `router.push` on redirect to `/submissions` — prevents back-button from returning athlete to acceptance page
- `/auth/callback` only overrides to `?next=` when value is a non-empty string starting with `/` — protects against open redirect to external URLs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Athlete invite flow is now fully PKCE-compatible end-to-end
- UAT Test 6 (athlete clicks invite link, lands on /invite/accept, redirected to /submissions) can now be re-run
- Old `/invite/[token]` page remains as dead route — can be deleted in a cleanup pass

---
*Phase: 01-foundation*
*Completed: 2026-02-27*

## Self-Check: PASSED
- FOUND: src/app/invite/accept/page.tsx
- FOUND: src/actions/auth.ts
- FOUND: src/app/auth/callback/route.ts
- FOUND commit: 3b0d76c (Task 1)
- FOUND commit: c83ad62 (Task 2)
