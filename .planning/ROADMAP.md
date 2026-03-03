# Roadmap: Softball Mechanics Coaching App

## Overview

This roadmap delivers the core upload-analyze-annotate-deliver coaching loop across four phases. Phase 1 establishes the foundation: working video pipeline, auth, and athlete roster management. Phase 2 adds the softball-specific AI pose analysis layer that is the primary differentiator. Phase 3 builds the coach annotation workspace that closes the async feedback loop. Phase 4 delivers the athlete feedback inbox, session history, and side-by-side comparison view. Each phase produces a verifiable, coherent capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Auth, video upload and transcoding pipeline, and athlete roster (gap closure in progress) (completed 2026-02-27)
- [x] **Phase 2: AI Pose Analysis** - Softball-specific pose skeleton overlay and joint angle computation (completed 2026-02-28)
- [x] **Phase 2.1: Production Bug Fixes** - Mobile layout, phone upload errors, video display, duration limit, R2 lifecycle, consent gate (completed 2026-02-28)
- [ ] **Phase 2.2: AI Mechanics Analysis and Model Evaluation** - Motion-type tagging, new mechanics flags, Gemini VLM prototype, qualitative evaluation report
- [~] **Phase 3: Annotation Workspace** - Coach video review workspace with drawing tools and written coaching notes (DEFERRED — skipped for MVP)
- [ ] **Phase 4: Feedback Delivery** - Athlete feedback inbox, session history, and side-by-side comparison view

## Phase Details

### Phase 1: Foundation
**Goal**: Coaches and athletes can access the app with proper role separation, upload videos that transcode and stream reliably, and coaches can manage their athlete roster
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, VID-01, VID-02, ROST-01, ROST-02
**Success Criteria** (what must be TRUE):
  1. Coach can create an account, log in, and stay logged in across browser sessions
  2. Athlete can access the app via invite link without creating a full account
  3. Coach or athlete can upload a video from desktop or phone and the video plays back in the browser via HLS streaming within two minutes of upload
  4. Coach can invite an athlete and view their full roster
  5. Coach and athlete see separate role-scoped views — coach sees session queue, athlete sees their own submissions only
**Plans**: 9 plans

Plans:
- [x] 01-01-PLAN.md — Next.js 15 scaffold + all Phase 1 dependencies + Supabase migration SQL with full schema and RLS (completed 2026-02-27)
- [ ] 01-02-PLAN.md — Infrastructure wiring: Supabase clients, Next.js auth middleware, R2 client, Inngest client + serve handler + transcodeVideo function
- [x] 01-03-PLAN.md — Auth pages: coach signup/login, server actions, auth callback route, athlete invite acceptance
- [ ] 01-04-PLAN.md — Video upload pipeline: presign route, VideoUploader (desktop + mobile), UploadQueue, TranscodingStatus, HLSPlayer
- [ ] 01-05-PLAN.md — Roster + dashboards: coach session queue, athlete submissions view, invite modal, roster table, end-to-end verification checkpoint
- [ ] 01-06-PLAN.md — GAP: Fix invite flow — PKCE-compatible redirectTo, /auth/callback ?next= routing, /invite/accept page
- [ ] 01-07-PLAN.md — GAP: Optional athlete on upload — nullable athlete_id migration, remove upload gate
- [x] 01-08-PLAN.md — GAP: Middleware root route fix + .mov/.mkv contentType fallback (UAT tests 1 and 9) (completed 2026-02-27)
- [x] 01-09-PLAN.md — GAP: NEXT_PUBLIC_APP_URL deployed domain fix + Supabase redirect URLs config (UAT test 6 invite flow) (completed 2026-02-27)

### Phase 2: AI Pose Analysis
**Goal**: The app automatically extracts softball-specific pose data from uploaded videos so coaches can see a skeleton overlay, joint angles, and flagged mechanics issues on any frame
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. Coach can see a pose skeleton overlay (body landmarks) rendered on any video frame in the review workspace
  2. Joint angles (hip rotation, elbow slot, shoulder tilt) are displayed automatically for any selected frame
  3. The video timeline shows AI-flagged frames with a mechanics issue indicator and confidence score the coach can use as a reference
**Plans**: 6 plans

Plans:
- [x] 02-01-PLAN.md — Supabase migration 005 (video_analyses + video_analysis_frames tables + RLS) + TypeScript type contracts + Inngest Step 6 pending-analysis trigger (completed 2026-02-27)
- [ ] 02-02-PLAN.md — Pose library (angles/flags/landmarks pure functions) + MediaPipe Web Worker with Comlink + local WASM assets
- [ ] 02-03-PLAN.md — POST /api/analysis route — persists MediaPipe results from browser to Supabase with upsert
- [ ] 02-04-PLAN.md — usePoseAnalysis hook + VideoWithOverlay (HLS + canvas skeleton) + AnalysisTimeline (flagged frame markers)
- [ ] 02-05-PLAN.md — MechanicsSidebar (joint angles + flags + Prev/Next navigation) + /review/[videoId] review workspace page
- [x] 02-06-PLAN.md — End-to-end Phase 2 verification checkpoint (skeleton overlay, joint angles, flagging) (completed 2026-02-28)

### Phase 02.5: Review UX and usability across devices, Security, Performance and Code (INSERTED)

**Goal:** Make the app production-ready, resilient, and performant by closing security gaps, adding error boundaries, expanding test coverage to hitting flags, and fixing mobile review layout — without adding new features.
**Requirements**: UX-SEC-01, UX-SEC-02, UX-SEC-03, UX-SEC-04, UX-SEC-05, UX-CODE-01, UX-CODE-02, UX-CODE-03, UX-TEST-01, UX-TEST-02, UX-MOBILE-01, UX-MOBILE-02
**Depends on:** Phase 2
**Plans:** 4/4 plans complete

Plans:
- [ ] 02.5-01-PLAN.md — Security: RLS migration 008 (fix USING(true) write policies) + presign coachId fix + vlm-eval detail leak + debug log removal + rate limiting in middleware + review page supabase helper fix
- [ ] 02.5-02-PLAN.md — Code quality: ErrorBoundary component + wrap Review/Upload pages + remove profiles as any (dashboard, upload, roster)
- [ ] 02.5-03-PLAN.md — Test coverage: hitting mechanics flags tests (5 flags + cross-motion) + angle computation tests (TDD)
- [ ] 02.5-04-PLAN.md — Mobile UX: sidebar lg:min-h-0 fix + human verify mobile (375px) and desktop review page layout

### Phase 02.4: Invite via email and send feedback email (INSERTED)

**Goal:** Coach can send a branded invite email to athletes via Resend (in addition to the Supabase auth email) and send a mechanics feedback summary email to athletes directly from the review page (containing the VLM/Gemini analysis summary + link to /submissions).
**Requirements**: EMAIL-INVITE-01, EMAIL-FEEDBACK-01
**Depends on:** Phase 2
**Plans:** 3/3 plans complete

**Approach:** Resend (email) — free tier 3,000 emails/month, no phone number needed, athlete email already exists in coach_athletes.athlete_email. No DB migration needed. Install: `npm install resend`. RESEND_API_KEY must NOT have NEXT_PUBLIC_ prefix (server-side only).

Plans:
- [ ] 02.4-01-PLAN.md — Install resend npm package + src/lib/email.ts Resend sendEmail() wrapper + .env.local.example RESEND_API_KEY docs
- [ ] 02.4-02-PLAN.md — Extend inviteAthlete() with non-fatal sendEmail() branded invite + InviteAthleteModal success message update
- [ ] 02.4-03-PLAN.md — sendFeedbackEmail() server action + MechanicsSidebar "Send feedback email" button + ReviewPageClient wiring + human verify checkpoint

### Phase 02.3: better pitching mechanics analysis and Gemini flash VLM summary (INSERTED)

**Goal:** Add two new pitching mechanics flags (Arm Circle bent elbow, Stride Off Power Line), pitching-specific ideal ranges and sidebar label rename, and Gemini Flash VLM commentary wired into the Session Summary section with DB persistence.
**Requirements**: PITCH-FLAG-01, PITCH-FLAG-02, PITCH-RANGES-01, PITCH-LABELS-01, VLM-COMMENTARY-01, VLM-DB-01
**Depends on:** Phase 2.2
**Plans:** 3/3 plans complete

Plans:
- [ ] 02.3-01-PLAN.md — New pitching flags (detectArmCircleBentElbow, detectStrideOffPowerLine) + PITCHING_IDEAL_RANGES + SummaryFrame isContact/timestampMs extension
- [ ] 02.3-02-PLAN.md — MechanicsSidebar motion-type-aware angle labels (Hip Drive / Arm Slot) + PITCHING_IDEAL_RANGES display
- [ ] 02.3-03-PLAN.md — DB migration 007 (vlm_summary) + vlm-eval route promotion + AnalysisSummary VLM button + ReviewPageClient contact-frame extraction + usePoseAnalysis vlm_summary load

### Phase 02.1: Production Bug Fixes (INSERTED)

**Goal:** Fix six production issues discovered after Phase 2 before starting Phase 3
**Requirements**: TBD
**Depends on:** Phase 2
**Plans:** 1 plan

Plans:
- [x] 02.1-01-PLAN.md — Six bug fixes: responsive nav + review layout, FFmpeg /tmp guard + aspect ratio, skeleton overlay alignment, 5s duration limit, R2 lifecycle policy, legal consent gate (completed 2026-02-28)

### Phase 02.2: AI Mechanics Analysis and Model Evaluation (INSERTED)

**Goal:** Evaluate MediaPipe on real softball video, add motion-type tagging to upload flow, add new motion-specific mechanics flags (Bat Casting for hitting, Premature Shoulder Opening for pitching), prototype Gemini Flash VLM as a second opinion layer, and document evaluation findings
**Requirements**: EVAL-01, EVAL-02, EVAL-03, MOTION-01, MOTION-02, MOTION-03, FLAGS-01, FLAGS-02
**Depends on:** Phase 2.1
**Plans:** 5/5 plans complete

Plans:
- [ ] 02.2-01-PLAN.md — DB migration 006 (motion_type column on videos) + MotionType TypeScript type + AnalysisPayload update
- [ ] 02.2-02-PLAN.md — Upload UI motion-type selector (Hitting/Pitching radio) + VideoUploader motionType prop + presign route writes motion_type to DB
- [ ] 02.2-03-PLAN.md — flags.ts refactor: motion dispatch + detectBatCasting (hitting) + detectPrematureShoulderOpening (pitching)
- [ ] 02.2-04-PLAN.md — Review page reads motion_type from DB + ReviewPageClient/usePoseAnalysis/MechanicsSidebar wired with motionType + motion badge in sidebar
- [ ] 02.2-05-PLAN.md — Gemini Flash VLM prototype route (POST /api/analysis/vlm-eval) + qualitative evaluation checkpoint + RESEARCH.md evaluation results

### Phase 3: Annotation Workspace *(DEFERRED — skipped for MVP)*
**Goal**: Coaches can annotate a video frame with drawing tools, add written coaching cues, then deliver a structured feedback package
**Depends on**: Phase 2
**Requirements**: VID-03, VID-04, ANN-01, ANN-02, ANN-03, ANN-04, ANN-05
**Success Criteria** (what must be TRUE):
  1. Coach can scrub through video frame-by-frame and play at 0.25x and 0.5x slow motion
  2. Coach can freeze a frame and draw freehand, straight lines, and arrows in at least four colors (red, green, yellow, white)
  3. Coach can place an angle measurement overlay and add text labels on a frozen frame
  4. Annotations replay in sync with the video when the coach scrubs or plays back the session
**Plans**: TBD

### Phase 4: Feedback Delivery
**Goal**: Athletes receive their complete feedback package in an inbox, coaches can review full session history per athlete, and coaches can load a reference video for synchronized side-by-side comparison
**Depends on**: Phase 3
**Requirements**: FEED-01, FEED-02, FEED-03, ROST-03
**Success Criteria** (what must be TRUE):
  1. Coach can add written coaching cues tied to specific timestamps and deliver the complete package to the athlete
  2. Athlete can open their inbox, see all feedback packages, and watch the annotated video with coaching cues in sync
  3. Coach can view the full session history for any athlete in their roster
  4. Coach can load a reference video alongside the athlete's video and scrub both in synchronized lock-step
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 9/9 | Complete | 2026-02-27 |
| 2. AI Pose Analysis | 6/6 | Complete | 2026-02-28 |
| 2.1 Production Bug Fixes | 1/1 | Complete | 2026-02-28 |
| 2.2 AI Mechanics Analysis and Model Evaluation | 4/5 | In Progress|  |
| 3. Annotation Workspace | 0/TBD | Not started | - |
| 4. Feedback Delivery | 0/TBD | Not started | - |

### Phase 5: Branding and marketing

**Goal:** Rebrand the app from "Softball Mechanics" to "Diamond Mechanics", build the public-facing marketing landing page at the root URL, apply brand identity consistently across the internal app and auth pages, and deliver SEO/meta assets (per-page titles, favicon, OG image).
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05
**Depends on:** Phase 4
**Plans:** 3/4 plans executed

Requirement IDs defined:
- BRAND-01: App renamed "Diamond Mechanics" everywhere — all user-facing UI text, email copy, page titles, and consent strings
- BRAND-02: Diamond blue brand color (oklch ≈ #2563eb) cascades across entire app via CSS token updates in globals.css
- BRAND-03: Public landing page at root URL with hero, feature highlights, and how-it-works sections; warm, community-focused copy for baseball and softball coaches
- BRAND-04: Auth pages (login, signup) and app shell nav rebranded with Diamond Mechanics logo/wordmark; invite acceptance pages show brand name
- BRAND-05: Per-page SEO metadata on all app routes; favicon replaced with Diamond Mechanics brand mark; OG image for landing page social sharing

Plans:
- [ ] 05-01-PLAN.md — CSS brand tokens (globals.css --primary/--ring/--sidebar-primary → Diamond blue) + root layout metadata (title template, description, OG config)
- [ ] 05-02-PLAN.md — Diamond Mechanics landing page (hero + features + how it works) + human-verify checkpoint
- [ ] 05-03-PLAN.md — App shell nav + auth layout + invite pages rebrand + email copy + consent text + Inngest client id
- [ ] 05-04-PLAN.md — Per-page metadata (5 app routes) + favicon (icon.svg) + OG image (opengraph-image.png) + human-verify checkpoint
