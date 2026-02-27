# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 3 of 5 in current phase
Status: In progress
Last activity: 2026-02-27 — Completed 01-03 (auth UI: signup/login pages, server actions, invite acceptance); 3/5 plans done in Phase 1

Progress: [███░░░░░░░] 15%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3 minutes
- Total execution time: 0.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/5 | 8 min | 2.7 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (2 min), 01-03 (2 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4-phase structure — Foundation → Annotation → AI → Feedback Delivery
- [Roadmap]: Research flags Phase 3 (AI) and Phase 5/live sessions (deferred to v2) as needing deeper research before execution
- [Architecture]: Async job queue (Inngest) must be wired in Phase 1 before any AI or transcoding work — serverless timeout risk
- [Architecture]: Cloudflare R2 for video storage (zero egress fees) decided in Phase 1 — expensive to migrate later
- [Architecture]: Annotations stored as time-indexed JSON in Postgres, never burned into video — decided before Phase 2 build
- [01-01]: Used temp directory for create-next-app scaffold due to .planning/ conflict; rsync-copied files into project root
- [01-01]: .gitignore updated to allow committing .env.local.example (no secrets, documents all required env vars)
- [01-01]: Supabase service role key intentionally bypasses RLS for Inngest transcoding worker — no policy added for service role
- [01-02]: Middleware creates its own Supabase client from @supabase/ssr directly — server.ts uses next/headers cookies() which is unavailable in Edge runtime
- [01-02]: supabase.auth.getUser() used everywhere (not getSession) — getSession reads cookie without JWT verification, insecure
- [01-02]: SUPABASE_SERVICE_ROLE_KEY added to .env.local.example (was missing from Plan 01)
- [01-03]: Invite acceptance uses supabase.auth.setSession() not verifyOtp — inviteUserByEmail sends hash-fragment tokens, not OTP codes
- [01-03]: inviteAthlete uses admin client (service role key) — inviteUserByEmail is admin-only API; browser client cannot call it
- [01-03]: Middleware already allows /invite paths through PUBLIC_PATHS — no change needed for invite acceptance page

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: MediaPipe accuracy on softball-specific motions (windmill pitch, full-rotation swing) is unverified. Validate with real softball video during Phase 3 spike before committing to full AI worker build.
- [Phase 3]: Canvas library choice (Fabric.js vs. Konva.js) — prototype both in Phase 2 spike before committing.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01-03-PLAN.md — Auth UI (signup/login pages, server actions, callback route, athlete invite acceptance). Ready to execute 01-04-PLAN.md.
Resume file: None
