---
status: diagnosed
phase: 01-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md
started: 2026-02-27T00:00:00Z
updated: 2026-02-27T00:00:00Z
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

## Current Test

[testing complete]

## Tests

### 1. App loads and redirects to login
expected: Visit http://localhost:3000 — redirected to /login with a login form (email + password fields visible).
result: pass

### 2. Coach signup
expected: Go to /signup. Fill in name, email, and password (min 8 chars). Submit. You land on /dashboard with an empty state — no videos yet. There should be a CTA to invite athletes or upload.
result: pass

### 3. Coach login
expected: Go to /login. Enter the coach email and password. Submit. You are redirected to /dashboard.
result: pass

### 4. Role-based navigation
expected: While logged in as a coach, the nav shows links for Dashboard, Upload, and Roster. There is no "My Submissions" link (that's athlete-only).
result: pass

### 5. Roster page — invite athlete modal
expected: Go to /roster. Click the invite button. A modal appears with an email input. Enter an athlete's email and submit. The athlete appears in the roster table with an "Invite sent" status badge.
result: pass

### 6. Athlete accepts invite
expected: The invited athlete checks their email and clicks the invite link. They land on /invite/[token] which shows an acceptance UI. After accepting, they are redirected to /submissions.
result: issue
reported: "after clicking the invite link I was redirected to login page and not submissions"
severity: major

### 7. Role guard — athlete redirected from /dashboard
expected: While logged in as an athlete, navigate directly to /dashboard. You are immediately redirected to /submissions (not shown the coach dashboard).
result: skipped
reason: Cannot test — athlete account setup blocked by invite flow bug (test 6)

### 8. Upload page — athlete selection required
expected: Go to /upload as a coach. The video upload dropzone is NOT shown until you select an athlete from the dropdown. Once an athlete is selected, the VideoUploader appears.
result: issue
reported: "I should be able to upload a video without inviting an athlete, the coach can fill in the details"
severity: major

### 9. Video upload with progress bar
expected: On the upload page with an athlete selected, drag a video file onto the dropzone (or click to select). A progress bar appears showing upload percentage. After 100%, a "Processing" badge appears.
result: skipped
reason: Cannot test — blocked by invite flow bug (test 6); no athlete account available

### 10. Transcoding complete — dashboard shows video
expected: After a few minutes, the video status changes from "Processing" to "Ready" on the dashboard. The coach's dashboard shows the video with a thumbnail, the athlete's name, and the upload date.
result: skipped
reason: Cannot test — blocked by invite flow bug (test 6); no athlete account available

## Summary

total: 10
passed: 5
issues: 2
pending: 0
skipped: 3
skipped: 0

## Gaps

- truth: "Athlete clicks invite link and lands on /invite/[token] acceptance UI, then redirected to /submissions"
  status: failed
  reason: "User reported: after clicking the invite link I was redirected to login page and not submissions"
  severity: major
  test: 6
  root_cause: "Three compounding issues: (1) inviteAthlete sets redirectTo=/auth/callback instead of an invite-accept route, so Supabase sends athlete to the wrong URL; (2) /auth/callback exchanges the code and immediately redirects to /submissions without updating coach_athletes from pending to active — falls back to /login on any error; (3) /invite/[token]/page.tsx reads tokens from window.location.hash (implicit flow) but the app uses PKCE flow which delivers a ?code= query param, so token parsing always fails silently even if reached"
  artifacts:
    - path: "src/actions/auth.ts"
      issue: "redirectTo points to /auth/callback instead of a dedicated invite-accept route"
    - path: "src/app/auth/callback/route.ts"
      issue: "No awareness of type=invite; immediately redirects to /submissions bypassing coach_athletes update; falls back to /login on any error"
    - path: "src/app/invite/[token]/page.tsx"
      issue: "Reads tokens from window.location.hash (implicit flow) — incompatible with PKCE flow used by @supabase/ssr; [token] route segment is never populated"
  missing:
    - "Set redirectTo in inviteAthlete to APP_URL + /auth/callback?next=/invite/accept"
    - "In /auth/callback, detect ?next= param and route to invite acceptance instead of /submissions"
    - "Create /invite/accept page that uses the already-established session to update coach_athletes and redirect to /submissions (no hash parsing needed)"
  debug_session: ""

- truth: "Coach can upload a video without first selecting an athlete from a roster (athlete details can be filled in on upload)"
  status: failed
  reason: "User reported: I should be able to upload a video without inviting an athlete, the coach can fill in the details"
  severity: major
  test: 8
  root_cause: "Upload is blocked at three independent layers: (1) UploadPageClient gates VideoUploader behind canUpload = !!effectiveAthleteId; (2) presign route has athleteId: z.string().uuid() as hard required; (3) videos.athlete_id is NOT NULL FK in DB schema. Fix requires Option A (deferred assignment): make athlete_id nullable in schema, optional in Zod + component, remove UI gate, and update RLS insert policy to allow null athlete_id when coach uploads."
  artifacts:
    - path: "src/components/upload/UploadPageClient.tsx"
      issue: "canUpload = !!effectiveAthleteId gates VideoUploader; empty roster shows dead-end message"
    - path: "src/app/api/upload/presign/route.ts"
      issue: "athleteId: z.string().uuid() — hard required, rejects requests without a valid UUID"
    - path: "src/components/upload/VideoUploader.tsx"
      issue: "athleteId typed as string (non-optional), passed directly in presign body"
    - path: "supabase/migrations/001_initial_schema.sql"
      issue: "athlete_id UUID NOT NULL + RLS insert policy requires athlete_id = auth.uid()"
  missing:
    - "New migration: ALTER TABLE videos ALTER COLUMN athlete_id DROP NOT NULL"
    - "New migration: update videos_insert_authenticated RLS policy to allow athlete_id IS NULL when coach_id = auth.uid()"
    - "presign/route.ts: athleteId z.string().uuid().optional(), pass athlete_id: athleteId ?? null in DB insert"
    - "VideoUploader.tsx: athleteId?: string (optional)"
    - "UploadPageClient.tsx: remove canUpload gate, always render VideoUploader for coaches"
  debug_session: ""
