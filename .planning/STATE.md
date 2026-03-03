---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Annotation Workspace
status: planning_next_milestone
last_updated: "2026-03-03"
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03 after v1.0 milestone)

**Core value:** Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.
**Current focus:** Planning v2.0 — Annotation Workspace and Feedback Delivery (Phase 3)

## Current Position

**v1.0 ARCHIVED** — All 9 v1 phases complete, 18/18 requirements satisfied, git tag v1.0 pending.
Status: Ready to start v2.0 with `/gsd:new-milestone`
Last activity: 2026-03-03 — Phase 06 complete (all integration bug fixes closed); milestone archived

Progress: [████████████████████] 75% (Phase 1 complete, Phase 2 complete, Phase 2.1 complete, Phase 2.2 Plans 01-02 complete)

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
| Phase 02.2-ai-mechanics-analysis-and-model-evaluation P01 | 5 | 2 tasks | 2 files |
| Phase 02.2-ai-mechanics-analysis-and-model-evaluation P03 | 1 | 1 tasks | 1 files |
| Phase 02.2-ai-mechanics-analysis-and-model-evaluation P02 | 2 | 2 tasks | 3 files |
| Phase 02.2 P05 | 15 | 3 tasks | 4 files |
| Phase 02.2-ai-mechanics-analysis-and-model-evaluation P04 | 2 | 2 tasks | 4 files |
| Phase 02.3 P01 | 5 | 2 tasks | 4 files |
| Phase 02.3 P02 | 1 | 1 tasks | 1 files |
| Phase 02.3 P03 | 12 | 3 tasks | 6 files |
| Phase 02.4 P01 | 2 | 2 tasks | 5 files |
| Phase 02.4 P02 | 2 | 2 tasks | 2 files |
| Phase 02.4-invite-email-and-feedback P03 | 5 | 2 tasks | 4 files |
| Phase 02.4-invite-email-and-feedback P03 | 15 | 3 tasks | 4 files |
| Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code P03 | 3 | 1 tasks | 2 files |
| Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code P01 | 3 | 2 tasks | 6 files |
| Phase 02.5 P04 | 15 | 2 tasks | 1 files |
| Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code P02 | 3 | 2 tasks | 5 files |
| Phase 05 P01 | 76 | 2 tasks | 2 files |
| Phase 05-branding-and-marketing P02 | 3 | 1 tasks | 1 files |
| Phase 05-branding-and-marketing P03 | 2 | 2 tasks | 8 files |
| Phase 05-branding-and-marketing P02 | 5 | 2 tasks | 1 files |
| Phase 05-branding-and-marketing P04 | 15 | 3 tasks | 7 files |
| Phase 06-v1-integration-bug-fixes P02 | 1 | 2 tasks | 3 files |
| Phase 06-v1-integration-bug-fixes P01 | 7 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
v1.0 key decisions captured in PROJECT.md.

Recent decisions affecting current work (v2.0):

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
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: MotionType is a video-level property (not per-frame) — kept off FrameAnalysis; CHECK constraint includes 'unknown' as explicit valid state; DEFAULT 'unknown' preserves backward compat without backfill
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: flagMechanics 5th param defaults to 'hitting' — zero-diff backward compat; 'unknown' routes to hitting for pre-Phase-2.2 videos
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: detectBatCasting hardcoded to RHH lead-side (left wrist/hip) — left-handed hitter support deferred to future enhancement
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: motionType optional in VideoUploaderProps with default 'hitting' — backward compat for future uses without selector
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: motionType in useCallback dep array prevents stale closure sending wrong motion type after radio change
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: Zod .default('hitting') on PresignSchema — server-side fallback if client omits field
- [Phase 02.2]: MediaPipe EVAL-01 PASS — keep as primary pose estimator; Gemini Flash adds value as optional VLM overlay; YOLO11 deferred (not available locally)
- [Phase 02.2]: GEMINI_API_KEY must not have NEXT_PUBLIC_ prefix — server-side only in src/app/api/
- [Phase 02.2]: YOLO11 17 COCO keypoints require separate YOLO_LANDMARK_INDICES — never mix with MediaPipe 33-point index scheme
- [Phase 02.2-ai-mechanics-analysis-and-model-evaluation]: MechanicsSidebar badge hidden when motionType is 'unknown' — avoids confusing coaches reviewing pre-Phase-2.2 footage
- [Phase 02.3]: Import angleBetweenThreePoints from angles.ts in flags.ts instead of inlining — already exported, no code duplication
- [Phase 02.3]: Vitest chosen as first test framework in project — no babel config overhead vs Jest, works cleanly with ESM + TypeScript
- [Phase 02.3]: isPitching derived const used for label and range selection — single branching point, easy to extend to future motionTypes
- [Phase 02.3]: extractContactFrame uses video.currentTime seek + seeked event + canvas JPEG; DB persist is non-fatal; vlmSummary from hook synced to local state via useEffect; motionType unknown falls back to hitting for vlm-eval
- [Phase 02.4]: Approach changed from Twilio SMS to Resend email — free tier 3,000/month, athlete_email already in coach_athletes, no DB migration needed, no phone number/carrier compliance burden
- [Phase 02.4]: sendEmail() in src/lib/email.ts is non-fatal in invite flow (Supabase invite already sent); fatal in feedback flow (surface error to coach)
- [Phase 02.4]: RESEND_FROM_EMAIL is optional env var defaulting to 'noreply@resend.dev' — allows dev/staging without domain verification
- [Phase 02.4]: RESEND_FROM_EMAIL defaults to noreply@resend.dev — allows dev/staging without domain verification
- [Phase 02.4]: Vitest class mock pattern for SDK constructors: class MockResend used over vi.fn().mockImplementation() arrow function
- [Phase 02.4]: Branded email is non-fatal: Supabase invite already sent before Resend call; email failure only logs, never changes inviteAthlete() return value
- [Phase 02.4]: sendFeedbackEmail() double .eq() guard (id + coach_id) on video query replicates RLS at query level without explicit Supabase policy on video_analyses
- [Phase 02.4]: Feedback button state machine (idle/sending/sent/error) prop-drilled from ReviewPageClient to MechanicsSidebar — error surfaces after click not as disabled button
- [Phase 02.4-invite-email-and-feedback]: sendFeedbackEmail() double .eq() guard (id + coach_id) replicates RLS at query level without explicit policy on video_analyses
- [Phase 02.4-invite-email-and-feedback]: Feedback button state machine (idle/sending/sent/error) prop-drilled from ReviewPageClient to MechanicsSidebar — error surfaces after click not as disabled button
- [Phase 02.4-invite-email-and-feedback]: Deep-link feedback email to /review/[videoId] not /submissions — athlete lands directly on specific video analysis
- [Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code]: angles.test.ts makeLm() defaults to HIGH visibility — opposite of flags tests LOW default; angle tests test null-return explicitly with VIS_LOW overrides
- [Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code]: Cross-motion isolation tests grouped in dedicated describe block for discoverability
- [Phase 02.5]: request.ip not available on NextRequest in Next.js 16 — use x-forwarded-for + x-real-ip headers for IP in rate limiter
- [Phase 02.5]: coachId removed from PresignSchema entirely — Zod strips unknown keys by default, server derives coach_id from auth user.id
- [Phase 02.5]: In-memory rate limiter via Map in middleware — resets per cold start, acceptable for v1 without Redis
- [Phase 02.5]: RLS write policies scoped by video ownership join: video_id IN (SELECT id FROM videos WHERE coach_id = auth.uid())
- [Phase 02.5]: lg:min-h-0 on flex children: add to aside element so inner overflow-y-auto can activate when parent has bounded height on desktop; has no effect on mobile flex-col stack layout
- [Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code]: ErrorBoundary uses 'use client' class component — React has no functional error boundary API as of React 19
- [Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code]: Cast Supabase join results via (x as unknown as ProfileRow | null) — Supabase infers foreign key joins as array type; direct cast fails TS2352; unknown bridge is correct workaround
- [Phase 02.5-review-ux-and-usability-across-devices-security-performance-and-code]: Upload page filter excludes ProfileRow entries where full_name is null to match UploadPageClient prop type { id: string; full_name: string }[]
- [Phase 05]: oklch color space used throughout to match existing shadcn token format; Diamond blue oklch(0.546 0.245 262.881) applied to --primary, --ring, --sidebar-primary, --sidebar-ring
- [Phase 05]: OG image references /opengraph-image.png as static asset placeholder — image file not created in this plan
- [Phase 05]: Landing page tagline 'Help every athlete reach their potential.' — warm, athlete-outcome-focused framing
- [Phase 05]: Landing page features framed as 'As a coach, you can...' — emphasizes coach capability over AI technology
- [Phase 05-branding-and-marketing]: Diamond SVG icon + wordmark used in nav/auth; text-primary class on SVG path inherits brand blue from Plan 01
- [Phase 05-branding-and-marketing]: Inngest app id changed from softball-mechanics to diamond-mechanics — Inngest Cloud treats as new app, acceptable for rebrand
- [Phase 05-branding-and-marketing]: Consent text broadened to 'baseball and softball mechanics analysis' — more inclusive and accurate
- [Phase 05-branding-and-marketing]: Landing page tagline 'Help every athlete reach their potential.' — warm, outcome-focused, athlete-centered (not AI-SaaS framing)
- [Phase 05-branding-and-marketing]: Feature copy uses 'As a coach, you can...' framing — emphasizes coach capability over AI technology
- [Phase 05-branding-and-marketing]: OG image placed in public/ (not src/app/) to avoid duplicate og:image from Next.js file-convention auto-detection; explicit metadata.openGraph.images in layout.tsx points to /opengraph-image.png
- [Phase 05-branding-and-marketing]: OG image is a placeholder 1x1 PNG; proper 1200x630 branded image required before production launch
- [Phase 05-branding-and-marketing]: Static 'Review' title used for dynamic /review/[videoId] route; dynamic per-video titles deferred to future enhancement
- [Phase 06-v1-integration-bug-fixes]: Feedback email CTA changed to /submissions — athletes fail coach_id check on review page and get bounced to /dashboard
- [Phase 06-v1-integration-bug-fixes]: Invite branded Resend email CTA changed to /login — /auth/callback with no token causes auth_callback_failed; supplementary email should link to a working page
- [Phase 06-01]: Exact-match for '/' in isPublicPath: startsWith('/') matched every URL path — fixed to p === '/' ? pathname === '/' : pathname.startsWith(p)
- [Phase 06-01]: coachId added back to PresignSchema as optional nullable uuid — trusted only for athlete role; coach role always uses user.id (client coachId ignored for security)
- [Phase 06-01]: 400 returned when athlete role has no coachId — defense-in-depth API layer validates what upload page resolves server-side
- [Phase 06-v1-integration-bug-fixes]: Feedback email magic link: admin.auth.admin.generateLink(magiclink) embeds auto-login URL pointing to /auth/callback?next=/submissions — static /submissions required prior login
- [Phase 06-v1-integration-bug-fixes]: Invite email generateLink: replaced inviteUserByEmail + implicitClient/signInWithOtp with admin generateLink(invite) for new users and generateLink(magiclink) for existing — real action_link embedded in branded email, no parallel Supabase system email needed

### Roadmap Evolution

- Phase 2.2 inserted after Phase 2.1: AI Mechanics Analysis and Model Evaluation (URGENT) — evaluate current MediaPipe accuracy on softball motions, research alternative/better models, improve mechanics feedback quality
- Phase 02.3 inserted after Phase 2: better pitching mechanics analysis and Gemini flash VLM summary (URGENT)
- Phase 02.4 inserted after Phase 2: invite via email (Resend) and provide feedback via email from review page (originally SMS/Twilio, replanned 2026-03-02 to Resend email)
- Phase 02.5 inserted after Phase 2: Review UX and usability across devices, Security, Performance and Code (URGENT)
- Phase 5 added: Branding and marketing

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3 / v2]: Canvas library choice (Fabric.js vs. Konva.js) — research during v2 planning before committing.
- [v2 pre-launch]: OG image placeholder needs a proper 1200x630 branded design before going public.
- [v2 pre-launch]: Landing page copy "They see exactly what you see — no login required" is inaccurate — fix before v2.

## Session Continuity

Last session: 2026-03-03
Stopped at: v1.0 milestone complete. All phases done, archived, git tag pending.
Resume: Run `/gsd:new-milestone` to start v2.0 planning.
Resume file: None
