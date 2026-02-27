---
phase: 01-foundation
plan: "03"
subsystem: auth-ui
tags: [auth, supabase, next.js, server-actions, invite-flow, role-based-redirect]
dependency_graph:
  requires:
    - 01-02 (Supabase browser/server clients, middleware)
  provides:
    - signUp, signIn, signOut, inviteAthlete server actions (src/actions/auth.ts)
    - Auth callback route handler (src/app/auth/callback/route.ts)
    - Coach signup page (src/app/(auth)/signup/page.tsx)
    - Coach login page (src/app/(auth)/login/page.tsx)
    - Auth route group layout (src/app/(auth)/layout.tsx)
    - Athlete invite acceptance page (src/app/invite/[token]/page.tsx)
  affects:
    - All authenticated routes (coaches now have signup/login entry points)
    - Athlete onboarding (invite email + acceptance flow)
    - /dashboard (destination after coach login — planned in 01-05)
    - /submissions (destination after athlete invite acceptance — planned in 01-05)
tech_stack:
  added: []
  patterns:
    - Server Actions with FormData — 'use server' actions called from client components via form action prop
    - Admin Supabase client (service role) for inviteUserByEmail — browser client cannot send admin invites
    - Hash-based invite token flow — Supabase inviteUserByEmail puts tokens in URL hash (#access_token=...&type=invite), not query params
    - supabase.auth.setSession() for invite acceptance — not verifyOtp; hash tokens require setSession
    - Role-based redirect pattern — athlete → /submissions, coach → /dashboard applied in both signIn and callback route
key_files:
  created:
    - src/actions/auth.ts
    - src/app/auth/callback/route.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/invite/[token]/page.tsx
  modified: []
decisions:
  - "Invite acceptance uses supabase.auth.setSession() not verifyOtp — inviteUserByEmail sends hash-fragment tokens (#access_token), not OTP codes; setSession is the correct method for hash-based flows"
  - "inviteAthlete uses admin client (service role key) — inviteUserByEmail is admin-only API; browser client cannot call it"
  - "Invite page has standalone centered layout (not wrapped in (auth) route group) — invite flow is athlete-facing, has different UX requirements"
  - "Middleware already allows /invite paths through PUBLIC_PATHS — confirmed no change needed to middleware for invite acceptance page"
metrics:
  duration: "2 minutes"
  completed_date: "2026-02-27"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 1 Plan 3: Auth UI and Server Actions Summary

**One-liner:** Complete auth system — coach signup/login with role-based redirect, admin-client athlete invite via inviteUserByEmail, hash-fragment invite acceptance with setSession, and OAuth callback route using exchangeCodeForSession.

## What Was Built

### Task 1: Auth Server Actions and Callback Route

**src/actions/auth.ts** — All auth server actions in a single `'use server'` module:

| Action | What it does |
|--------|-------------|
| `signUp(formData)` | Creates coach account with `role: 'coach'` in user_metadata, redirects to `/dashboard` |
| `signIn(formData)` | Signs in with email/password, role-based redirect: athletes → `/submissions`, coaches → `/dashboard` |
| `signOut()` | Signs out and redirects to `/login` |
| `inviteAthlete(email, coachId)` | Uses admin client to send invite email, creates `coach_athletes` row with `status: 'pending'` |

`inviteAthlete` uses `getAdminClient()` which creates a Supabase client with the service role key — required because `admin.auth.admin.inviteUserByEmail` is an admin-only API endpoint.

**src/app/auth/callback/route.ts** — GET route handler for Supabase auth redirects:
- Extracts `code` from query params
- Calls `supabase.auth.exchangeCodeForSession(code)` to complete PKCE flow
- Routes by user role: athlete → `/submissions`, coach → `/dashboard`
- Falls back to `/login?error=auth_callback_failed` on any error

### Task 2: Auth Pages — Signup, Login, and Athlete Invite Acceptance

**src/app/(auth)/layout.tsx** — Centered card layout for the auth route group. Wraps login and signup pages with a centered max-w-md container and app title/tagline header.

**src/app/(auth)/signup/page.tsx** — Coach registration form (`'use client'`):
- Fields: fullName, email (required), password (required, minLength=8)
- Calls `signUp` server action via form `action` prop
- Displays inline error state on failure; no redirect handling needed (server action redirects)

**src/app/(auth)/login/page.tsx** — Coach login form (`'use client'`):
- Fields: email, password
- Calls `signIn` server action via form `action` prop
- Displays inline error state; role-based redirect handled in server action

**src/app/invite/[token]/page.tsx** — Athlete invite acceptance page (`'use client'`):
- Parses hash fragment: `window.location.hash` → `#access_token=...&refresh_token=...&type=invite`
- Calls `supabase.auth.setSession({ access_token, refresh_token })` to establish session
- On success: updates `coach_athletes` row (sets `athlete_id`, `status: 'active'`, `joined_at`)
- Redirects to `/submissions` after 1.5 second delay
- Three visual states: loading spinner, success message, error message

## Invite Flow: Hash-Based vs Code-Based

**Why hash-based (setSession) and not verifyOtp:**

Supabase's `admin.auth.admin.inviteUserByEmail` sends an invite email where the magic link contains tokens in the URL hash fragment (e.g., `https://app.com/invite/abc123#access_token=eyJ...&refresh_token=...&type=invite`). This is different from:
- **Email OTP flow** (uses `verifyOtp` with a 6-digit code)
- **Magic link / PKCE flow** (uses `exchangeCodeForSession` with a `?code=` query param)

The invite tokens are in the hash because hash fragments are not sent to the server — this keeps the raw tokens client-side only. The correct acceptance method is `supabase.auth.setSession({ access_token, refresh_token })` which directly establishes the session from the tokens already in hand.

## Middleware Compatibility Confirmation

The middleware from Plan 02 already includes `/invite` in `PUBLIC_PATHS`:

```typescript
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/invite']
```

Since the check uses `startsWith`, the path `/invite/[token]` matches `/invite` and passes through without auth redirect. No middleware changes were needed.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` exits 0 | PASSED |
| `src/actions/auth.ts` exports signUp, signIn, signOut, inviteAthlete | PASSED |
| `signIn` has role-based redirect (athlete → /submissions, coach → /dashboard) | PASSED |
| `auth/callback/route.ts` calls `exchangeCodeForSession` | PASSED |
| `auth/callback/route.ts` has role-based redirect | PASSED |
| `invite/[token]/page.tsx` uses `setSession` (not verifyOtp) | PASSED |
| `inviteAthlete` uses admin client (service role) | PASSED |
| Signup page uses `'use client'` and calls `signUp` | PASSED |
| Login page uses `'use client'` and calls `signIn` | PASSED |
| No hardcoded credentials or test data | PASSED |
| Middleware allows /invite paths through PUBLIC_PATHS | PASSED (unchanged) |

## Deviations from Plan

None — plan executed exactly as written.

## Task Commit Log

| Task | Name | Commit |
|------|------|--------|
| 1 | Auth server actions and callback route | 36b8f82 |
| 2 | Auth pages — signup, login, and athlete invite acceptance | efd4490 |

## Self-Check: PASSED
