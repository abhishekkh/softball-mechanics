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
- [ ] **Phase 3: Annotation Workspace** - Coach video review workspace with drawing tools and written coaching notes
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

### Phase 3: Annotation Workspace
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
| 3. Annotation Workspace | 0/TBD | Not started | - |
| 4. Feedback Delivery | 0/TBD | Not started | - |
