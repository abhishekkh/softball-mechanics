---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-28T06:15:19.408Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 15
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.
**Current focus:** Phase 3 - Annotation Workspace

## Current Position

Phase: 2.1 of 4 (Bug Fixes) — COMPLETE
Plan: 1 of 1 in current phase — COMPLETE
Status: Phase 2.1 complete — six production bugs fixed and verified by user
Last activity: 2026-02-28 — Completed Phase 2.1 bug fixes (mobile layout, FFmpeg phone upload, video AR, skeleton overlay, 5s limit, R2 lifecycle, consent gate)

Progress: [████████████████████] 75% (Phase 1 complete, Phase 2 complete, Phase 2.1 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3 minutes
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 9/9 | 160 min | 17.8 min |
| 02-ai-pose-analysis | 5/6 | 14 min | 2.8 min |

**Recent Trend:**
- Last 5 plans: 01-06 (2 min), 01-07 (2 min), 01-08 (5 min), 01-09 (137 min incl. human verify wait), 02-01 (2 min)
- Trend: Stable

*Updated after each plan completion*
| Phase 01-foundation P07 | 2 | 2 tasks | 4 files |
| Phase 01-foundation P08 | 5 | 2 tasks | 3 files |
| Phase 01-foundation P09 | 137 | 2 tasks | 2 files |
| Phase 02-ai-pose-analysis P01 | 2 | 2 tasks | 3 files |
| Phase 02-ai-pose-analysis P02 | 8 | 2 tasks | 11 files |
| Phase 02-ai-pose-analysis P03 | 2 | 1 tasks | 1 files |
| Phase 02-ai-pose-analysis P04 | 2 | 2 tasks | 3 files |
| Phase 02-ai-pose-analysis P05 | 2 | 3 tasks | 5 files |
| Phase 02-ai-pose-analysis P06 | 45 | 1 task (human verify) | 6 files |

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
- [01-04]: XHR used instead of fetch for R2 upload — fetch does not expose upload progress events; XHR xhr.upload.progress is required for per-file progress bars
- [01-04]: Mobile input has no capture attribute — capture forces live camera recording; omitting it lets athletes select from camera roll
- [01-04]: TranscodingStatus uses useEffect for onReady callback — TanStack Query v5 removed onSuccess from useQuery; useEffect is the v5-correct pattern
- [Phase 01-foundation]: [01-05]: Upload page requires athlete selection before enabling VideoUploader — prevents unassigned uploads
- [Phase 01-foundation]: [01-05]: UploadPageClient is thin client wrapper so server component can fetch roster and pass to client
- [Phase 01-foundation]: acceptInvite uses admin client (service role) to update coach_athletes — RLS restricts updates to coach owner; athlete is not the coach so service role required
- [Phase 01-foundation]: /auth/callback honors ?next= param for explicit routing overrides — protects against open redirect by requiring value starts with '/'
- [Phase 01-foundation]: [01-07]: athlete_id is now nullable in videos table — coaches can upload without assigning an athlete (deferred assignment pattern)
- [Phase 01-foundation]: [01-07]: RLS INSERT policy updated — third OR clause (coach_id = auth.uid() AND athlete_id IS NULL) required because NULL comparisons are never truthy in SQL
- [Phase 01-foundation]: [01-07]: UploadPageClient canUpload gate removed — VideoUploader always renders; athlete dropdown is advisory only
- [Phase 01-foundation]: [01-08]: Two-entry middleware matcher array — '/' explicit first entry + existing regex — avoids regex rewrite risk
- [Phase 01-foundation]: [01-08]: VideoUploader uses file.type || 'video/mp4' fallback — keeps Zod /^video\// regex valid for .mov/.mkv/.avi uploads
- [Phase 01-foundation]: [01-08]: R2 presign errors caught at route layer (not lib/r2.ts) — route handler owns HTTP response shape
- [Phase 01-foundation]: [01-09]: NEXT_PUBLIC_APP_URL must match Supabase Site URL and Redirect URLs allowlist exactly — localhost value causes otp_expired on invite email links
- [Phase 01-foundation]: [01-09]: .env.local.example placeholder updated to https://your-deployed-domain.vercel.app — documents that deployed HTTPS domain is required, not localhost
- [Phase 02-ai-pose-analysis]: [02-01]: Step 6 is non-fatal — insert failure logs error but does not throw, keeping transcoding idempotent and retryable
- [Phase 02-ai-pose-analysis]: [02-01]: AnalysisStatus uses string union type (not enum) — matches Supabase CHECK constraint exactly, avoids runtime enum mismatch
- [Phase 02-ai-pose-analysis]: [02-01]: JSONB for landmarks and flags columns — schema-flexible storage for variable-length arrays; REAL columns for computed angles enable efficient queries
- [Phase 02-ai-pose-analysis]: Worker imports only npm packages (not @/ aliases) — Next.js bundler cannot resolve path aliases inside Web Worker modules
- [Phase 02-ai-pose-analysis]: MediaPipe initialized from /mediapipe/wasm local path (not CDN) — production-safe, no CDN dependency at analysis time
- [Phase 02-ai-pose-analysis]: runningMode: IMAGE — discrete frame-by-frame analysis; matches per-frame extraction pattern in Plan 03 hook
- [Phase 02-ai-pose-analysis]: FLAG_CONFIDENCE_THRESHOLD = 0.70 — only flag mechanics when joint visibility >= 70%, filters low-quality frame noise
- [Phase 02-ai-pose-analysis]: [02-04]: analysisErrorMessage: string|null exposed by usePoseAnalysis — non-null when status=error; Plan 05 MechanicsSidebar must render error callout above partial frames (per CONTEXT.md "show partial results with a warning — do not hide data")
- [Phase 02-ai-pose-analysis]: [02-04]: findNearestFrame uses 300ms tolerance (1.5 frames at 5fps) — matches HLS seek granularity to sampled frame grid; O(1) map lookup not needed at this scale
- [Phase 02-ai-pose-analysis]: [02-05]: MechanicsSidebar Joint Angles renders for complete | low_confidence | error status — partial results never suppressed per CONTEXT.md locked decision "show partial results with a warning"
- [Phase 02-ai-pose-analysis]: [02-05]: ReviewPageClient uses useMemo videoRef proxy to bridge overlayRef.current?.videoElement to usePoseAnalysis without changing forwardRef contract
- [Phase 02-ai-pose-analysis]: [02-05]: findFrameAtTime returns null if nearest frame is >300ms away — prevents stale data from showing during video scrubbing between frames
- [Phase 02-ai-pose-analysis]: [02-06]: Hip translation detection bounds analysis to swing window — stops sampling when batter's hip X-position delta exceeds threshold (batter running to first base)
- [Phase 02-ai-pose-analysis]: [02-06]: Contact frame white timeline marker at peak hip rotation — coach reference for impact point without manual scrubbing
- [Phase 02-ai-pose-analysis]: [02-06]: MediaPipe WASM must use absolute origin URL in Web Worker — relative paths fail when Next.js rewrites asset routes; pattern: new URL('/mediapipe/wasm', self.location.origin).href
- [Phase 02-ai-pose-analysis]: [02-06]: Canvas sized to videoElement.videoWidth/videoHeight (natural dimensions), not CSS layout size — CSS size causes skeleton landmark coordinate misalignment
- [Phase 02-ai-pose-analysis]: [02-06]: /api/inngest excluded from auth middleware PUBLIC_PATHS — Inngest webhook was receiving 401 before event processing could occur

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3]: MediaPipe accuracy on softball-specific motions (windmill pitch, full-rotation swing) is unverified. Validate with real softball video during Phase 3 spike before committing to full AI worker build.
- [Phase 3]: Canvas library choice (Fabric.js vs. Konva.js) — prototype both in Phase 2 spike before committing.

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 02-06-PLAN.md — Phase 2 complete. All 5 verification flows passed (framing tips, dashboard Review link, skeleton overlay, live joint angles, flagged frame markers). 9 post-build fixes applied during human verification. Ready for Phase 3: Annotation Workspace.
Resume file: None
