# Phase 06: v1.0 Integration Bug Fixes (GAP CLOSURE) - Research

**Researched:** 2026-03-03
**Domain:** Next.js middleware auth, Supabase server actions, Resend email deep-links, presign API athlete upload
**Confidence:** HIGH

## Summary

Phase 06 addresses four concrete integration breaks identified by the v1.0 milestone audit — all are small, surgical code changes with no new libraries, no schema migrations, and no new routes. All bugs have been traced to their exact source lines. The full application is already built; this phase is purely corrective.

The four bugs are: (1) `'/'` in `PUBLIC_PATHS` makes `startsWith('/')` match every path, defeating edge-layer auth redirect in middleware; (2) athlete uploads get the athlete's own ID written as `coach_id` because the presign route uses `user.id` unconditionally; (3) the feedback email CTA links athletes to `/review/${videoId}` which immediately redirects them away because the review page enforces `coach_id === user.id`; (4) the branded Resend invite email CTA links to `/auth/callback` with no token, yielding `auth_callback_failed` for every athlete who clicks it.

Each fix is a 1-5 line change in an existing file. The biggest complexity is the athlete upload coach_id fix, which requires threading `athleteCoachId` from the client-side `VideoUploader` into the presign request body, then trusting that value on the server only when the authenticated user is an athlete. A stale test at `src/actions/__tests__/feedback.test.ts:222` also needs to be updated to match the new `/submissions` URL. No new dependencies are needed.

**Primary recommendation:** Implement the four fixes as a single plan (or two small plans) in exact file order: middleware first (simplest, highest severity), presign route + VideoUploader second (most complex, requires tracing the coachId prop chain), feedback email URL third, invite CTA fourth. Fix the stale test in the same commit as the feedback URL change.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | Coach can log in and stay logged in across browser sessions | Middleware PUBLIC_PATHS fix restores edge-layer auth redirect so unauthenticated requests can't reach protected routes |
| AUTH-04 | Athlete can access their submissions and feedback via invite link / magic link | Middleware fix closes the auth bypass; invite CTA fix (EMAIL-INVITE-01) ensures the branded email delivers a working entry point |
| VID-01 | Coach or athlete can upload a video from their camera roll | Athlete upload presign fix threads the correct coach_id so athlete videos appear on the coach dashboard |
| EMAIL-INVITE-01 | Athlete receives branded Resend invite email with a link to access the app | Invite CTA fix changes /auth/callback (dead) to /login (working) |
| EMAIL-FEEDBACK-01 | Coach can send a mechanics feedback summary email with a link to /submissions | Feedback URL fix changes /review/${videoId} (athlete can't access) to /submissions (athlete can access) |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js middleware | 16 (app router) | Edge runtime auth gating via `PUBLIC_PATHS` | Already in use; fix is removal of one array entry |
| @supabase/ssr | current | Auth session reading in middleware and server components | Already wired; no API change |
| Resend | current | Transactional email delivery | Already wired in `src/lib/email.ts` |
| Vitest | current | Unit test runner | Already configured; stale test must be updated |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js server actions | 16 | `sendFeedbackEmail()`, `inviteAthlete()` in `src/actions/` | Already used — no migration needed |
| Supabase admin client | current | Service-role queries for athlete coachId lookup | Already used in `src/app/(app)/upload/page.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Changing `/login` in invite CTA | Remove CTA entirely from branded email | Removing CTA is also acceptable; `/login` is preferred because it gives athlete a working entry point with fewer surprises |
| Passing coachId through client request body | Re-fetching coachId server-side in presign route | Server-side re-fetch is more secure but requires an extra DB call per presign; client-side pass is acceptable since presign route already validates user is authenticated and only trusts the value for athlete role |

**Installation:**
```bash
# No new packages needed — all fixes use existing dependencies
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── middleware.ts              # Fix 1: remove '/' from PUBLIC_PATHS
├── app/api/upload/presign/route.ts  # Fix 2: use coachId from request body for athlete role
├── components/upload/VideoUploader.tsx  # Fix 2: send coachId in presign body (already does — verify)
├── components/upload/UploadPageClient.tsx  # Fix 2: ensure effectiveCoachId is threaded correctly
├── actions/feedback.ts        # Fix 3: change /review/${videoId} to /submissions
├── actions/auth.ts            # Fix 4: change /auth/callback to /login in invite CTA
└── actions/__tests__/feedback.test.ts  # Fix 3 companion: update stale URL assertion
```

### Pattern 1: Middleware PUBLIC_PATHS startsWith Bug

**What:** `PUBLIC_PATHS` includes `'/'`. The check `PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))` — since every path starts with `'/'`, `isPublicPath` is always `true`. No unauthenticated request ever gets redirected to `/login`.

**Current code (line 4):**
```typescript
// src/middleware.ts
const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback', '/invite', '/api/inngest']
```

**Fix:** Remove `'/'` from the array. The root path `/` is protected by the matcher config which already lists `'/'` explicitly to ensure middleware runs there — but that just means middleware *runs*, not that it's *public*. The landing page at `src/app/page.tsx` is accessible to unauthenticated users because it calls `supabase.auth.getUser()` server-side and handles `null` user gracefully — it does NOT need a PUBLIC_PATHS bypass.

**After fix:**
```typescript
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/invite', '/api/inngest']
```

**Confidence:** HIGH — traced directly in `src/middleware.ts:4` and `src/middleware.ts:63-65`.

**Warning sign to verify:** After removing `'/'`, confirm the landing page still loads without redirect. The root `src/app/page.tsx` must handle unauthenticated users without redirecting. If it has a hard `redirect('/login')` for null users, middleware must keep `'/'` public. Current `src/app/page.tsx` is confirmed to be a marketing landing page that does not redirect unauthenticated visitors.

### Pattern 2: Athlete Upload — Wrong coach_id

**What:** The presign route (`src/app/api/upload/presign/route.ts:41`) inserts `coach_id: user.id` for all users. When an athlete (not a coach) uploads, `user.id` is the athlete's ID, not their coach's ID.

**Current DB insert (line 37-46):**
```typescript
const { error: dbError } = await supabase.from('videos').insert({
  id: videoId,
  athlete_id: athleteId ?? null,
  uploaded_by: user.id,
  coach_id: user.id,  // BUG: always the caller's ID — wrong when caller is an athlete
  title: filename.replace(/\.[^.]+$/, ''),
  raw_r2_key: r2Key,
  status: 'processing',
  motion_type: motionType,
})
```

**The existing data flow for athlete uploads (tracing through codebase):**

1. `src/app/(app)/upload/page.tsx` — server component. Detects `role === 'athlete'`, uses admin client to look up `coach_id` from `coach_athletes`, stores it as `athleteCoachId`.
2. `src/app/(app)/upload/page.tsx:62` passes `coachId={role === 'coach' ? user.id : athleteCoachId}` to `UploadPageClient`.
3. `src/components/upload/UploadPageClient.tsx:19` stores this as `effectiveCoachId = coachId ?? ''` (the audit flagged this as `TODO Phase 5` with empty string fallback).
4. `src/components/upload/UploadPageClient.tsx:107` passes `coachId={effectiveCoachId}` to `VideoUploader`.
5. `src/components/upload/VideoUploader.tsx:84` sends `coachId` in the presign request body.
6. `src/app/api/upload/presign/route.ts` — IGNORES `coachId` from the body (comment says "coachId intentionally omitted") and uses `user.id`.

**Fix options:**

Option A (recommended): Add `coachId` back to `PresignSchema` as an optional UUID field. When present and the authenticated user's role is `athlete`, use the provided `coachId` as the video's `coach_id`. When absent or user is a coach, fall back to `user.id`. The schema already strips unknown fields by default — adding it back with a conditional path.

Option B: Re-fetch `coachId` server-side in the presign route from `coach_athletes`. More secure (never trusts client-provided value) but adds a DB round-trip per presign request. For v1 athlete upload scale, either is acceptable.

**Recommended implementation (Option A):**
```typescript
// Updated PresignSchema
const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//),
  athleteId: z.string().uuid().optional().nullable(),
  coachId: z.string().uuid().optional().nullable(),  // re-added: athlete provides their coach's ID
  motionType: z.enum(['hitting', 'pitching']).default('hitting'),
})

// In POST handler, after auth check:
const role = user.user_metadata?.role ?? 'coach'
const resolvedCoachId = role === 'athlete' && parseResult.data.coachId
  ? parseResult.data.coachId
  : user.id
// Then use resolvedCoachId in the videos.insert()
```

**Confidence:** HIGH — full prop chain traced through 4 files. `athleteCoachId` lookup is already correct in the upload page server component.

**Key constraint from STATE.md:** The `coachId intentionally omitted` comment from Phase 02.5 was added to prevent client-supplied coachId from being trusted for *coaches* (security fix). The fix must preserve this: only trust client coachId when the authenticated user is a confirmed athlete.

### Pattern 3: Feedback Email Deep-Link Fix

**What:** `src/actions/feedback.ts:46` constructs:
```typescript
const submissionsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${videoId}`
```

The review page at `src/app/(app)/review/[videoId]/page.tsx:37` enforces:
```typescript
if (video.coach_id !== user.id) redirect('/dashboard')
```

Athletes land on `/review/${videoId}`, get checked, fail `video.coach_id !== user.id`, and are sent to `/dashboard` (which is empty or wrong for athletes). The v2 athlete read-only review is out of scope for this phase.

**Fix:** Change line 46 to:
```typescript
const submissionsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/submissions`
```

This is the only change to `feedback.ts`. `/submissions` is athlete-accessible (confirmed: `src/app/(app)/submissions/page.tsx` queries by `athlete_id = user.id`).

**Stale test (MUST update in same commit):**
`src/actions/__tests__/feedback.test.ts:222` asserts:
```typescript
expect(emailHtml).toContain('https://example.com/review/video-id-with-athlete')
```
After the fix this becomes:
```typescript
expect(emailHtml).toContain('https://example.com/submissions')
```

**Confidence:** HIGH — both files read and confirmed.

### Pattern 4: Invite Email CTA Fix

**What:** `src/actions/auth.ts:122` constructs:
```typescript
const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
```

`/auth/callback` with no `code` or `token_hash` query params falls through all branches and returns `redirect('/login?error=auth_callback_failed')`. Supabase auth's own invite email is separate and delivers a real token — only the *branded* Resend email CTA is broken.

**Fix:** Change line 122 to:
```typescript
const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/login`
```

The branded email CTA becomes a simple prompt to go to the login page, which is always a valid action for a new athlete. (Athletes won't use this button anyway — Supabase's auth email delivers the real invite token. The branded email is supplementary.)

**Confidence:** HIGH — `src/actions/auth.ts:122` and `src/app/auth/callback/route.ts` both read and confirmed.

### Anti-Patterns to Avoid

- **Do not make `/` public again to fix the landing page.** The landing page server component handles `null` user without calling `redirect()` — it shows marketing content. No PUBLIC_PATHS bypass needed.
- **Do not trust client-supplied coachId for coach-role users.** The Phase 02.5 security decision explicitly removed coachId from the schema to prevent coaches from spoofing it. The fix must use a role check: only apply client coachId when `user.user_metadata?.role === 'athlete'`.
- **Do not build an athlete-accessible review page in this phase.** The audit's own recommendation is to use `/submissions` as a stopgap until v2 athlete inbox (FEED-02). Keep the review page coach-only.
- **Do not change the Supabase invite `redirectTo` URL.** Only the Resend branded email's CTA needs to change. `admin.auth.admin.inviteUserByEmail(email, { redirectTo: ... })` passes the real token; that flow is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| athlete coachId lookup | Custom auth helper | Already in `upload/page.tsx` using service role admin client | DB query already written and tested |
| Role detection | Custom JWT decode | `user.user_metadata?.role` from Supabase `getUser()` | Already established pattern (STATE.md phase 02.5 decision) |

**Key insight:** All four fixes are modifications to existing code paths. No new infrastructure, no new routes, no new helpers.

---

## Common Pitfalls

### Pitfall 1: Landing Page Breaks After Removing '/' from PUBLIC_PATHS

**What goes wrong:** After removing `'/'`, unauthenticated users visiting the root URL get redirected to `/login` instead of seeing the landing page.
**Why it happens:** The middleware middleware matcher includes `'/'` so middleware runs on the root route. Without `'/'` in PUBLIC_PATHS, the root route becomes a protected route.
**How to avoid:** Confirm that `src/app/page.tsx` (the landing page) does NOT call `redirect('/login')` for null users. It must render marketing content for unauthenticated visitors. Current code confirmed to do this (landing page is public content). Verify manually after the fix.
**Warning signs:** 302 redirect to /login when accessing root URL while unauthenticated.

### Pitfall 2: Athlete Cannot Upload If coachId Is Missing

**What goes wrong:** If `athleteCoachId` is `undefined` in the upload page (athlete not yet linked to any coach), `effectiveCoachId` becomes `''` (empty string). The VideoUploader sends `coachId: ''` to presign. The fix should gracefully handle this: if coachId from body is empty/null, fall back to `user.id` (which is the athlete — still wrong, but no worse than today) and ideally surface an error.
**Why it happens:** The `UploadPageClient` has a `TODO Phase 5` comment at line 19 acknowledging this edge case.
**How to avoid:** In the presign route fix, validate that `coachId` is a non-empty UUID before using it. Invalid coachId should return a 400 error to the uploader.
**Warning signs:** Coach dashboard shows no athlete-uploaded videos even after the fix.

### Pitfall 3: Stale Test Not Updated With Feedback URL Change

**What goes wrong:** `feedback.test.ts:222` asserts `/review/video-id-with-athlete` in the email HTML. After changing `feedback.ts` to use `/submissions`, this test fails CI.
**Why it happens:** Audit explicitly flagged `feedback.test.ts:222` as a stale URL assertion (1/9 tests failing).
**How to avoid:** Update the assertion in the same commit as the `feedback.ts` source change.
**Warning signs:** `npx vitest run` fails with `AssertionError: expected '...https://example.com/submissions...' to contain 'https://example.com/review/video-id-with-athlete'`.

### Pitfall 4: Invite Email Regression — Supabase Token URL Unchanged

**What goes wrong:** Developer accidentally changes the `redirectTo` parameter in `inviteUserByEmail()` or `signInWithOtp()` when fixing the branded email CTA.
**Why it happens:** Both URLs are set in the same `inviteAthlete()` function. The fix target is line 122; lines 62 and 80 contain the Supabase auth redirect URLs (which are correct and must stay as `/auth/callback`).
**How to avoid:** Only change line 122 (`inviteLink`). Lines 62 (`redirectTo` for `inviteUserByEmail`) and 80 (`emailRedirectTo` for `signInWithOtp`) must remain pointing to `/auth/callback`.

---

## Code Examples

Verified patterns from existing codebase:

### Fix 1: Middleware PUBLIC_PATHS (src/middleware.ts:4)
```typescript
// BEFORE (line 4):
const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback', '/invite', '/api/inngest']

// AFTER:
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/invite', '/api/inngest']
```

### Fix 2: Presign Route — Role-Aware coach_id Resolution
```typescript
// src/app/api/upload/presign/route.ts

// Add coachId to schema (was intentionally removed — Phase 02.5 security fix for coach-role)
const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//),
  athleteId: z.string().uuid().optional().nullable(),
  coachId: z.string().uuid().optional().nullable(),  // trusted only for athlete role
  motionType: z.enum(['hitting', 'pitching']).default('hitting'),
})

// In POST handler after auth + parse:
const role = user.user_metadata?.role ?? 'coach'
const resolvedCoachId = (role === 'athlete' && parseResult.data.coachId)
  ? parseResult.data.coachId
  : user.id

// In videos.insert():
const { error: dbError } = await supabase.from('videos').insert({
  id: videoId,
  athlete_id: athleteId ?? null,
  uploaded_by: user.id,
  coach_id: resolvedCoachId,  // FIXED: uses athlete's actual coach when uploader is athlete
  // ...
})
```

### Fix 3: Feedback Email URL (src/actions/feedback.ts:46)
```typescript
// BEFORE:
const submissionsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${videoId}`

// AFTER:
const submissionsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/submissions`
```

### Fix 3 companion: Stale Test (src/actions/__tests__/feedback.test.ts:222)
```typescript
// BEFORE:
expect(emailHtml).toContain('https://example.com/review/video-id-with-athlete')

// AFTER:
expect(emailHtml).toContain('https://example.com/submissions')
```

### Fix 4: Invite Email CTA (src/actions/auth.ts:122)
```typescript
// BEFORE:
const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

// AFTER:
const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/login`
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trust client coachId in presign body | Strip coachId from presign schema (Phase 02.5 security fix) | Phase 02.5 | Created the athlete upload bug — fix must restore coachId only for athlete-role with role check |
| Deep-link feedback email to specific video | Link to /submissions (this fix) | Phase 06 | Athlete can now click email CTA and reach a valid page; loses direct-to-video navigation (deferred to v2 athlete inbox) |

---

## Open Questions

1. **Landing page unauthenticated access after middleware fix**
   - What we know: `src/app/page.tsx` is the marketing landing page and does not redirect unauthenticated users
   - What's unclear: Whether any recent change (Phase 5 branding work) added an auth guard to the root page
   - Recommendation: Verify with a quick read of `src/app/page.tsx` before marking Fix 1 complete. Current read confirms it's safe.

2. **Athlete upload with no coach linked**
   - What we know: The upload page handles `athleteCoachId = undefined` when no coach_athletes record found; passes empty string to UploadPageClient
   - What's unclear: Should the presign route reject empty coachId with a 400, or silently fall back to `user.id`?
   - Recommendation: Return 400 with message "Athlete must be linked to a coach before uploading" when `role === 'athlete' && !coachId`. This gives a better UX than a silent wrong coach_id.

3. **Does fixing the middleware break any existing tests?**
   - What we know: No middleware-specific unit tests exist in the codebase (Vitest test files are all in `src/**/__tests__/`)
   - What's unclear: Whether any integration/smoke tests exercise the PUBLIC_PATHS check
   - Recommendation: Check that `npx vitest run` passes after Fix 1 (no tests expected to fail since middleware is not unit-tested).

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `src/middleware.ts`, `src/app/api/upload/presign/route.ts`, `src/components/upload/VideoUploader.tsx`, `src/components/upload/UploadPageClient.tsx`, `src/app/(app)/upload/page.tsx`, `src/actions/feedback.ts`, `src/actions/auth.ts`, `src/app/auth/callback/route.ts`, `src/actions/__tests__/feedback.test.ts` — all read and analyzed
- `.planning/v1.0-MILESTONE-AUDIT.md` — exact bug locations, severity, and recommended fixes verified
- `.planning/STATE.md` — Phase 02.5 decision: "coachId removed from PresignSchema entirely — Zod strips unknown keys by default, server derives coach_id from auth user.id"
- `.planning/REQUIREMENTS.md` — requirement IDs and descriptions verified

### Secondary (MEDIUM confidence)
- Next.js middleware docs pattern — `startsWith('/')` always returns true for any path (standard JavaScript string behavior, no ambiguity)

---

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH — all 4 bugs read directly from source files, confirmed against audit
- Fix implementation: HIGH — all fixes are 1-5 line changes in existing files, no new libraries
- Side-effects / edge cases: MEDIUM — athlete-with-no-coach edge case (Fix 2) is a known TODO that needs a decision; landing page unauthenticated access (Fix 1) confirmed safe from current read

**Research date:** 2026-03-03
**Valid until:** Stable — these are bug fixes in stable code; no external dependency changes needed
