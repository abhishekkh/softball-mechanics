---
status: diagnosed
phase: 01-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md
started: 2026-02-27T00:00:00Z
updated: 2026-02-27T00:00:00Z
note: re-verification after gap closure (plans 06+07 applied)
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. App loads and redirects to login
expected: Visit http://localhost:3000 — redirected to /login with a login form (email + password fields visible).
result: issue
reported: "no - Softball Mechanics — coming soon"
severity: major

### 2. Coach signup
expected: Go to /signup. Fill in name, email, and password (min 8 chars). Submit. You land on /dashboard with an empty state — no videos yet.
result: pass

### 3. Coach login
expected: Go to /login. Enter the coach email and password. Submit. You are redirected to /dashboard.
result: pass

### 4. Role-based navigation
expected: While logged in as a coach, the nav shows links for Dashboard, Upload, and Roster. There is no "My Submissions" link (that's athlete-only).
result: pass

### 5. Roster page — invite athlete modal
expected: Go to /roster. Click the invite button. A modal appears with an email input. Enter an athlete's email and submit. The athlete appears in the roster table with an "Invite sent" or "Pending" status badge.
result: pass

### 6. Athlete accepts invite
expected: The invited athlete checks their email and clicks the invite link. They land on /invite/accept (not /login). The page shows a loading spinner briefly, then redirects to /submissions. The athlete's row in the coach's roster should now show "Active" status.
result: issue
reported: "clicking on the email link sends me to the sign in page again. the error on the url is error=auth_callback_failed#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
severity: major

### 7. Role guard — athlete redirected from /dashboard
expected: While logged in as an athlete, navigate directly to /dashboard. You are immediately redirected to /submissions (not shown the coach dashboard).
result: skipped
reason: Cannot test — no athlete account available; invite flow still broken (test 6)

### 8. Upload page — no athlete required
expected: Go to /upload as a coach. The VideoUploader dropzone is visible immediately — no athlete selection required to see it. The athlete dropdown (if present) is labeled "Assign to athlete (optional)" with an "Unassigned" default option.
result: pass

### 9. Video upload with progress bar
expected: On /upload as a coach, drag a video file onto the dropzone (or click to select). A progress bar appears showing upload percentage. After 100%, a "Processing" badge appears.
result: issue
reported: "Failed to get upload URL"
severity: major

### 10. Transcoding complete — dashboard shows video
expected: After a few minutes, the video status changes from "Processing" to "Ready" on the dashboard. The coach's dashboard shows the video with a thumbnail and the upload date.
result: skipped
reason: Cannot test — upload blocked by presign failure (test 9)

## Summary

total: 10
passed: 5
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "Visiting http://localhost:3000 unauthenticated redirects to /login"
  status: failed
  reason: "User reported: no - Softball Mechanics — coming soon"
  severity: major
  test: 1
  root_cause: "Middleware matcher regex requires at least one character after the leading slash — bare '/' produces an empty capture group that does not match, so middleware never fires on the root route"
  artifacts:
    - path: "src/middleware.ts"
      issue: "matcher pattern '/((?!...).*)'  does not match bare '/' — needs explicit '/' entry added to the matcher array"
  missing:
    - "Add '/' as a separate entry in the matcher array in src/middleware.ts so the middleware runs on the root route"

- truth: "Athlete clicks invite link and lands on /invite/accept, then redirected to /submissions"
  status: failed
  reason: "User reported: clicking on the email link sends me to the sign in page again. the error on the url is error=auth_callback_failed#error=access_denied&error_code=otp_expired"
  severity: major
  test: 6
  root_cause: "NEXT_PUBLIC_APP_URL is set to http://localhost:3000 in .env.local, so invite emails contain a localhost redirectTo URL; Supabase rejects it (not in allowed redirect URLs list) causing otp_expired / access_denied before the browser reaches /auth/callback"
  artifacts:
    - path: ".env.local"
      issue: "NEXT_PUBLIC_APP_URL=http://localhost:3000 — must be the real deployed URL for invite emails to work outside localhost"
    - path: "Supabase dashboard > Authentication > URL Configuration"
      issue: "Redirect URLs allowlist must include the app URL; localhost may not be added"
  missing:
    - "Set NEXT_PUBLIC_APP_URL to the real app URL in .env.local and deployment environment"
    - "Add the app URL (and optionally http://localhost:3000 for local dev) to Supabase Redirect URLs allowlist"

- truth: "Coach can drag a video onto the dropzone and see a progress bar, then a Processing badge"
  status: failed
  reason: "User reported: Failed to get upload URL"
  severity: major
  test: 9
  root_cause: "file.type is empty string for certain video formats (.mov, .mkv, .avi) when dragged onto the dropzone; the presign route Zod schema rejects empty contentType with regex /^video\\//, returning 400 which the client surfaces as 'Failed to get upload URL'"
  artifacts:
    - path: "src/components/upload/VideoUploader.tsx"
      issue: "Sends contentType: file.type without guarding against empty string; empty MIME type fails Zod validation"
    - path: "src/app/api/upload/presign/route.ts"
      issue: "contentType Zod schema z.string().regex(/^video\\//) rejects empty string; getPresignedPutUrl has no try/catch for R2 errors"
  missing:
    - "VideoUploader.tsx: change contentType: file.type to contentType: file.type || 'video/mp4' as fallback"
    - "presign/route.ts: wrap getPresignedPutUrl in try/catch to return proper JSON 500 on R2 errors"
