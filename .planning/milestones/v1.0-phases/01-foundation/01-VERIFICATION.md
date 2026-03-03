---
phase: 01-foundation
verified: 2026-02-27T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Coach or athlete can upload a video from desktop or phone and the video plays back in the browser via HLS streaming within two minutes of upload"
    status: partial
    reason: "Two sub-gaps: (1) Athlete self-upload is broken — UploadPageClient passes coachId='' (empty string) to VideoUploader when the user is an athlete, which fails Zod UUID validation in the presign route (400 error). (2) HLSPlayer component is fully implemented but not imported or used in any page — no route renders the player, so HLS playback cannot actually occur in the browser yet."
    artifacts:
      - path: "src/components/upload/UploadPageClient.tsx"
        issue: "effectiveCoachId = coachId ?? '' passes empty string for athletes; presign Zod schema requires coachId as z.string().uuid() — this will always return 400 for athlete uploads"
      - path: "src/components/video/HLSPlayer.tsx"
        issue: "Component exists and is fully implemented but is ORPHANED — not imported or used by any page, dashboard row, or submissions view"
    missing:
      - "Fix athlete upload path: derive coachId from the athlete's coach_athletes relationship server-side and pass it to UploadPageClient, or make coachId optional in VideoUploader/presign when athleteId is the uploader"
      - "Wire HLSPlayer into at least one page (e.g. dashboard session row on click, or submissions page) so HLS playback is accessible in the browser"
  - truth: "Requirement AUTH-04 (Athlete can access their submissions and feedback via invite link / magic link) coverage"
    status: partial
    reason: "AUTH-04 is a Phase 1 requirement per REQUIREMENTS.md and ROADMAP.md but was not listed in the verification prompt. The invite flow itself works (PKCE via /auth/callback?next=/invite/accept is wired), but athlete video access is partially broken due to the coachId gap above that blocks athlete uploads. Auth-side of AUTH-04 is satisfied; upload-side is not."
    artifacts:
      - path: "src/app/invite/accept/page.tsx"
        issue: "Auth acceptance is correct. The gap is downstream: athlete cannot upload their own video."
    missing:
      - "Resolve athlete upload coachId gap (same fix as above truth)"

requirement_gaps:
  - id: "AUTH-04"
    note: "Present in ROADMAP.md Phase 1 requirements and REQUIREMENTS.md but NOT listed in the verification prompt. Including for completeness — auth portion is satisfied, but athlete upload is broken."
  - id: "ROST-01"
    note: "Present in ROADMAP.md Phase 1 requirements and REQUIREMENTS.md but NOT listed in the verification prompt. VERIFIED in codebase."
  - id: "ROST-02"
    note: "Present in ROADMAP.md Phase 1 requirements and REQUIREMENTS.md but NOT listed in the verification prompt. VERIFIED in codebase."
  - id: "VID-03"
    note: "Listed in verification prompt but belongs to Phase 3 (Annotation Workspace) per REQUIREMENTS.md and ROADMAP.md. Not a Phase 1 requirement. Not applicable."

human_verification:
  - test: "Confirm invite email delivery and PKCE flow"
    expected: "Athlete receives email, clicks link, lands on /invite/accept, coach_athletes row transitions from pending to active, athlete redirected to /submissions"
    why_human: "Requires real Supabase project with email delivery configured and a live R2/Inngest integration"
  - test: "Confirm HLS playback after transcoding completes"
    expected: "After ~2 minutes from upload, video status changes to 'ready' and the HLS stream plays in a browser"
    why_human: "HLSPlayer is not wired into any page yet; requires live Inngest transcoding pipeline and manual integration check"
  - test: "Confirm mobile camera roll upload on iOS/Android"
    expected: "Tapping 'Select videos to upload' opens camera roll (not camera), multi-select works, progress bar appears"
    why_human: "Requires physical device or accurate mobile simulator; no-capture attribute is in code but must be confirmed in browser"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Coaches and athletes can access the app with proper role separation, upload videos that transcode and stream reliably, and coaches can manage their athlete roster
**Verified:** 2026-02-27
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Requirement ID Note

The verification prompt listed: AUTH-01, AUTH-02, AUTH-03, VID-01, VID-02, VID-03

The actual Phase 1 requirements per ROADMAP.md and REQUIREMENTS.md are: AUTH-01, AUTH-02, AUTH-03, AUTH-04, VID-01, VID-02, ROST-01, ROST-02

**Discrepancies:**
- VID-03 (frame-by-frame scrub) is a Phase 3 requirement. Not applicable to Phase 1.
- AUTH-04, ROST-01, ROST-02 are Phase 1 requirements omitted from the prompt. All three are verified below.

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Coach can create an account, log in, and stay logged in across browser sessions | VERIFIED | `src/app/(auth)/signup/page.tsx` calls `signUp` server action; `src/actions/auth.ts` uses `supabase.auth.signUp` with role=coach metadata; `src/middleware.ts` uses `supabase.auth.getUser()` and cookie refresh on every request; `signIn` uses `signInWithPassword` with role-based redirect |
| 2 | Athlete can access the app via invite link without creating a full account | VERIFIED | `inviteAthlete` in `src/actions/auth.ts` uses admin `inviteUserByEmail` with `redirectTo` pointing to `/auth/callback?next=/invite/accept`; `/auth/callback/route.ts` honors `?next=` param; `/invite/accept/page.tsx` calls `acceptInvite()` server action using admin client to bypass RLS and update `coach_athletes`; middleware allows `/invite` prefix paths without auth |
| 3 | Coach or athlete can upload a video from desktop or phone and the video plays back via HLS within two minutes | PARTIAL | Upload pipeline is complete (presign route, XHR to R2, Inngest trigger, 5-step transcode function). Desktop drag-and-drop and mobile camera-roll inputs exist. HLSPlayer component is fully implemented BUT is not wired into any page — it is an orphaned export. Athlete self-upload is broken (see gaps). |
| 4 | Coach can invite an athlete and view their full roster | VERIFIED | `InviteAthleteModal` calls `inviteAthlete` server action; `src/app/(app)/roster/page.tsx` queries `coach_athletes` with athlete email, status, joined date; `RosterList` renders table with name/status/video-count columns |
| 5 | Coach and athlete see separate role-scoped views | VERIFIED | Middleware attaches `x-user-role` header; dashboard page redirects athletes to `/submissions`; submissions page does not redirect coaches; app layout renders role-appropriate nav; middleware blocks unauthenticated access with redirect to `/login` |

**Score:** 4/5 truths verified (Success Criterion 3 is partial)

---

## Required Artifacts

| Artifact | Status | Notes |
|----------|--------|-------|
| `package.json` | VERIFIED | All required packages present: `@supabase/supabase-js`, `@supabase/ssr`, `inngest`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `ffmpeg-static`, `react-dropzone`, `hls.js`, `@tanstack/react-query`, `zod` |
| `supabase/migrations/001_initial_schema.sql` | VERIFIED | All 3 tables (profiles, coach_athletes, videos), RLS enabled on all, 9+ policies, `handle_new_user` trigger present |
| `supabase/migrations/002_optional_athlete_id.sql` | VERIFIED | `ALTER TABLE videos ALTER COLUMN athlete_id DROP NOT NULL`; updated INSERT policy allowing NULL athlete_id for coaches |
| `src/lib/supabase/client.ts` | VERIFIED | Exports `createClient()` using `createBrowserClient` from `@supabase/ssr` |
| `src/lib/supabase/server.ts` | VERIFIED | Exports async `createClient()` using `createServerClient` from `@supabase/ssr` with cookie handling |
| `src/middleware.ts` | VERIFIED | Uses `supabase.auth.getUser()` (not `getSession`); gates unauthenticated routes; sets `x-user-role` header; matcher excludes static assets |
| `src/lib/r2.ts` | VERIFIED | Exports `r2` (S3Client for R2), `getPresignedPutUrl`, `getPresignedGetUrl`, `getPublicUrl` |
| `src/lib/ffmpeg.ts` | VERIFIED | `runFfmpeg()` uses `ffmpeg-static` path, spawns process, rejects on non-zero exit |
| `src/inngest/client.ts` | VERIFIED | Exports `inngest` Inngest instance with id `softball-mechanics` |
| `src/app/api/inngest/route.ts` | VERIFIED | Exports GET, POST, PUT via `serve()`; `transcodeVideo` in functions array |
| `src/inngest/functions/transcode-video.ts` | VERIFIED | All 5 `step.run()` checkpoints: download-raw-video, transcode-to-hls, upload-hls-to-r2, extract-thumbnail, update-status; uses service role client for DB update |
| `src/app/(auth)/signup/page.tsx` | VERIFIED | `'use client'`, calls `signUp` server action, fullName/email/password fields, error + loading states |
| `src/app/(auth)/login/page.tsx` | VERIFIED | `'use client'`, calls `signIn` server action, email/password fields, error + loading states |
| `src/app/(auth)/layout.tsx` | VERIFIED | Centered card layout for auth pages |
| `src/app/auth/callback/route.ts` | VERIFIED | `exchangeCodeForSession`, honors `?next=` param for invite flow, falls back to role-based redirect |
| `src/app/invite/[token]/page.tsx` | INFO | Old hash-based page; superseded by `/invite/accept`. Left as dead route. Not a blocker. |
| `src/app/invite/accept/page.tsx` | VERIFIED | `'use client'`, calls `acceptInvite()` on mount, `router.replace('/submissions')` on success, loading/error states |
| `src/actions/auth.ts` | VERIFIED | `'use server'`, exports `signUp`, `signIn`, `signOut`, `inviteAthlete`, `acceptInvite`; `inviteAthlete` redirectTo includes `?next=/invite/accept`; `acceptInvite` uses admin client to bypass RLS |
| `src/app/api/upload/presign/route.ts` | VERIFIED | POST endpoint; Zod validation; auth guard; creates DB record; returns presignedUrl+videoId+r2Key; `athleteId` is optional/nullable |
| `src/components/upload/VideoUploader.tsx` | VERIFIED | `react-dropzone` for desktop; native `<input accept="video/*">` WITHOUT `capture` for mobile; XHR for upload progress; fires `/api/inngest-trigger` after R2 upload |
| `src/components/upload/UploadQueue.tsx` | VERIFIED | Per-file progress bars and status badges; renders null for empty list |
| `src/components/upload/TranscodingStatus.tsx` | VERIFIED | TanStack Query with `refetchInterval`; stops polling on `ready`/`error`; `useEffect` for `onReady` callback (v5 compatible) |
| `src/components/video/HLSPlayer.tsx` | STUB/ORPHANED | Fully implemented, handles `Hls.isSupported()` and Safari native path — but NOT imported or used in any page. Component exists, is not wired. |
| `src/components/upload/UploadPageClient.tsx` | PARTIAL | `canUpload` gate removed (coach always sees uploader). However: `effectiveCoachId = coachId ?? ''` is an empty string when user is athlete — VideoUploader will send coachId='' to presign route which fails UUID Zod validation. |
| `src/app/(app)/layout.tsx` | VERIFIED | Reads `x-user-role` header from middleware; renders coach nav vs athlete nav; signOut form |
| `src/app/(app)/dashboard/page.tsx` | VERIFIED | Server component; role guard (athletes redirected); queries videos with `coach_id = user.id`; renders `SessionRow` list; empty state |
| `src/app/(app)/submissions/page.tsx` | VERIFIED | Server component; queries videos with `athlete_id = user.id`; renders status badges; empty state |
| `src/app/(app)/upload/page.tsx` | VERIFIED | Server component; fetches athlete roster for coaches; passes coachId/athleteId to `UploadPageClient` |
| `src/app/(app)/roster/page.tsx` | VERIFIED | Server component; coach-only guard; queries `coach_athletes` with video counts; renders `RosterList` + `InviteAthleteModal` |
| `src/components/roster/RosterList.tsx` | VERIFIED | Table with name, status (pending/active), video count, invited date; empty state |
| `src/components/roster/InviteAthleteModal.tsx` | VERIFIED | Calls `inviteAthlete` server action; success/error/loading states; modal overlay |
| `src/components/dashboard/SessionRow.tsx` | VERIFIED | Thumbnail, athlete name, upload date, `TranscodingStatus` badge |
| `src/app/api/inngest-trigger/route.ts` | VERIFIED | Auth guard; proxies `inngest.send()` for client-side event firing |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `src/lib/supabase/server.ts` | `createServerClient from @supabase/ssr` | WIRED | `createServerClient` called directly in middleware (correct pattern — middleware cannot use the shared `createClient` wrapper) |
| `src/app/api/inngest/route.ts` | `src/inngest/functions/transcode-video.ts` | `functions: [transcodeVideo]` in serve() | WIRED | `transcodeVideo` imported and in functions array |
| `src/inngest/functions/transcode-video.ts` | `src/lib/r2.ts` | R2 GetObject/PutObject | WIRED | `r2`, `getPublicUrl`, `GetObjectCommand`, `PutObjectCommand` all used |
| `src/components/upload/VideoUploader.tsx` | `src/app/api/upload/presign/route.ts` | fetch POST `/api/upload/presign` | WIRED | `fetch('/api/upload/presign', { method: 'POST' })` present |
| `src/components/upload/VideoUploader.tsx` | R2 presigned URL | XHR PUT | WIRED | `xhr.open('PUT', presignedUrl)` with `setRequestHeader('Content-Type', file.type)` |
| `src/components/upload/VideoUploader.tsx` | Inngest (via `/api/inngest-trigger`) | POST after R2 upload | WIRED | `fetch('/api/inngest-trigger', ...)` with `name: 'video/uploaded'` |
| `src/components/upload/TranscodingStatus.tsx` | Supabase `videos` table | TanStack Query polling every 5s | WIRED | `refetchInterval` stops on `ready`/`error`; `useEffect` triggers `onReady` callback |
| `src/components/video/HLSPlayer.tsx` | R2 public HLS URL | `hls.loadSource(src)` | NOT WIRED | HLSPlayer is implemented but not imported by any page or component |
| `src/actions/auth.ts inviteAthlete` | `src/app/auth/callback/route.ts` | `redirectTo` with `?next=/invite/accept` | WIRED | `redirectTo: .../auth/callback?next=/invite/accept` confirmed in code |
| `src/app/auth/callback/route.ts` | `src/app/invite/accept/page.tsx` | `NextResponse.redirect(new URL(next, origin))` | WIRED | `if (next && next !== '/' && next.startsWith('/'))` conditional redirect |
| `src/app/invite/accept/page.tsx` | `coach_athletes` table | `acceptInvite()` server action using admin client | WIRED | `acceptInvite` exported from `src/actions/auth.ts`; uses `getAdminClient()` to bypass RLS |
| `src/app/(app)/layout.tsx` | `src/middleware.ts` | `x-user-role` header | WIRED | Middleware sets `x-user-role`; layout reads via `headers().get('x-user-role')` |
| `src/components/roster/InviteAthleteModal.tsx` | `src/actions/auth.ts inviteAthlete` | direct server action call | WIRED | `import { inviteAthlete } from '@/actions/auth'`; called in `handleInvite` |

---

## Requirements Coverage

| Requirement | Phase 1 Per ROADMAP | In Prompt | Status | Evidence |
|-------------|---------------------|-----------|--------|----------|
| AUTH-01 | Yes | Yes | SATISFIED | `signUp` server action with email/password; profiles trigger auto-creates profile with role=coach |
| AUTH-02 | Yes | Yes | SATISFIED | `signIn` with `signInWithPassword`; cookie-based session refreshed by middleware on every request |
| AUTH-03 | Yes | Yes | SATISFIED | `inviteAthlete` uses admin `inviteUserByEmail`; PKCE callback routes to `/invite/accept`; `acceptInvite` activates `coach_athletes` row |
| AUTH-04 | Yes | Not listed | PARTIAL | Auth path works; athlete's video access via `/submissions` works (RLS allows `athlete_id = user.id`); athlete self-upload broken (coachId gap) |
| VID-01 | Yes | Yes | PARTIAL | Coach upload fully functional; athlete self-upload broken — `coachId` passed as empty string fails Zod UUID validation in presign route |
| VID-02 | Yes | Yes | SATISFIED | 5-step Inngest `transcodeVideo` function: download from R2, FFmpeg 720p HLS, upload HLS tree to R2, extract thumbnail, update DB status to 'ready' with `hls_url` |
| VID-03 | Phase 3 | Listed in prompt | NOT APPLICABLE | Frame-by-frame scrub is a Phase 3 / Annotation Workspace requirement. Not a Phase 1 deliverable. |
| ROST-01 | Yes | Not listed | SATISFIED | `/roster/page.tsx` queries `coach_athletes` + video counts; `RosterList` renders with status and video count columns |
| ROST-02 | Yes | Not listed | SATISFIED | `InviteAthleteModal` calls `inviteAthlete`; invite creates `coach_athletes` record with status=pending; PKCE flow activates it |

### Orphaned Requirements Check

Per REQUIREMENTS.md traceability table, Phase 1 covers: AUTH-01, AUTH-02, AUTH-03, AUTH-04, VID-01, VID-02, ROST-01, ROST-02 (8 requirements).

The verification prompt cited AUTH-01, AUTH-02, AUTH-03, VID-01, VID-02, VID-03. This omits AUTH-04, ROST-01, ROST-02 and incorrectly includes VID-03 (Phase 3). All 8 actual Phase 1 requirements are accounted for in this report.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/upload/UploadPageClient.tsx` | 17 | `effectiveCoachId = coachId ?? ''` with `// TODO Phase 5` | BLOCKER | Athlete uploads always fail — empty string fails Zod UUID validation in presign route; VID-01 and AUTH-04 partial |
| `src/components/video/HLSPlayer.tsx` | — | Orphaned export — not used by any page | WARNING | HLS playback not accessible in the browser; Success Criterion 3 (playback within 2 minutes) not achievable by end users |

---

## Human Verification Required

### 1. Invite Email Delivery and PKCE Flow End-to-End

**Test:** Create a coach account, click "Invite athlete" with a real email you control, check inbox, click invite link, confirm landing on `/invite/accept` with spinner then redirect to `/submissions`, confirm Supabase `coach_athletes` row has status=active.
**Expected:** Smooth one-click invite acceptance with no intermediary login page.
**Why human:** Requires live Supabase project with email delivery, real PKCE code exchange in browser.

### 2. HLS Playback After Transcoding

**Test:** Upload a short video as coach (via dashboard), wait ~2 minutes, confirm status badge changes from "Processing" to "Ready for Review" on `/dashboard`. Attempt to play video.
**Expected:** HLS stream plays in browser. (Note: HLSPlayer is not wired into any page — this will currently fail for end users until HLSPlayer is integrated.)
**Why human:** Requires live Inngest worker, R2 bucket, FFmpeg binary, and HLSPlayer must be wired into a page.

### 3. Mobile Camera Roll Upload

**Test:** Open `/upload` on iOS Safari or Android Chrome, tap "Select videos to upload", confirm camera roll opens (not camera app), select a file, confirm progress bar appears.
**Expected:** Camera roll picker opens; camera is NOT forced.
**Why human:** No `capture` attribute is confirmed in code, but behavior must be verified on physical device.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Athlete self-upload broken (blockers: VID-01, AUTH-04):**
In `src/components/upload/UploadPageClient.tsx` line 17, when the logged-in user is an athlete (no `coachId` prop), `effectiveCoachId` is set to an empty string. This empty string is passed through `VideoUploader` to the presign API route, which validates `coachId` as a required UUID via Zod. The validation fails with a 400 error, and the upload never begins. Athletes cannot upload their own videos. This is a known deferred item (`TODO Phase 5`) but it means VID-01 ("coach or athlete can upload") is only half-satisfied, and AUTH-04 (athlete accesses their submissions) is only partially functional.

**Gap 2 — HLSPlayer orphaned (blocks Success Criterion 3):**
`src/components/video/HLSPlayer.tsx` is a complete, correct hls.js implementation. However, it is not imported or used by any page, route, or component in the application. No user can watch a transcoded video in the browser because no UI surface renders the player. The plan notes this will be connected in a later phase, but without it, the Phase 1 success criterion "video plays back in the browser via HLS streaming" is not achievable.

These two gaps are independent in their fixes. The athlete-upload gap requires server-side derivation of the coach relationship for athletes. The HLSPlayer gap requires wiring the component into a page (e.g., clicking a session row on `/dashboard`).

---

*Verified: 2026-02-27*
*Verifier: Claude (gsd-verifier)*
