# Project Research Summary

**Project:** Softball Mechanics Coaching App
**Domain:** Sports video analysis coaching platform
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

This is a sports video coaching platform with softball-specific AI analysis at its core — a category that sits between generic video annotation tools (Coach's Eye, Dartfish) and heavyweight team management systems (Hudl). The competitive gap is clear: no existing tool combines softball-specific pose detection with a structured coach-athlete async workflow at a price point accessible to travel and youth coaches. The recommended approach is a web-first platform built on Next.js 15 + Supabase + Mux (video) + MediaPipe (AI pose detection) — a stack deployable by one developer with no ops complexity in v1 and clear upgrade paths as the platform grows.

The primary architecture is an async coaching loop: player uploads video, AI analysis runs in the background, coach receives annotated analysis with drawing tools, player receives structured feedback. The entire pipeline must be built around async job queues from day one — the single most critical architectural decision, because video processing (transcoding + pose detection) runs 60–120 seconds per clip, which will silently fail in any serverless function. A canvas-overlay approach for annotations (time-indexed JSON replayed over video) is the only viable pattern — burning annotations into the video file is a dead end that makes coach iteration impossible.

The highest-risk areas are MediaPipe accuracy on softball-specific motions (windmill pitch, full-rotation swing) and video egress costs. MediaPipe was trained on general fitness poses and loses tracking during fast or unusual arm positions — this requires confidence thresholding, frame smoothing, and framing all AI outputs as "estimates" the coach confirms, not automated verdicts. On the cost side, using Cloudflare R2 for video storage/delivery (zero egress fees) is non-negotiable — using S3 directly will create a compounding cost problem before the first paying customer.

---

## Key Findings

### Recommended Stack

The v1 stack is deliberately minimal and avoids all self-hosted ops complexity. Next.js 15 with App Router handles frontend and lightweight API routes. Supabase provides PostgreSQL (with Row Level Security for role enforcement), storage for raw videos, and realtime subscriptions. Mux handles video transcoding and HLS delivery, eliminating the need to run FFmpeg on serverless infrastructure. Clerk handles coach/player role differentiation. MediaPipe Pose runs in-browser (WASM) for near-instant feedback and server-side (Node.js) for stored keypoint extraction. Inngest provides the async job queue that is architecturally mandatory for the video pipeline.

**Core technologies:**
- **Next.js 15 + React 19:** Frontend framework with App Router for role-scoped routing — strong ecosystem for media apps
- **Supabase (Postgres + Storage + Auth):** Relational DB for coach-player relationships, RLS for access control, S3-compatible storage for video files
- **Mux:** Video transcoding to HLS + thumbnail generation — eliminates FFmpeg ops, simple webhook-based completion callbacks
- **Cloudflare R2:** Video storage with zero egress fees — single biggest cost protection decision
- **MediaPipe Pose (BlazePose):** In-browser WASM + server-side keypoint extraction — no API cost, 33 body landmarks, computes joint angles for hitting/pitching
- **Fabric.js 6:** Canvas annotation library with SVG export, arrow/angle primitives, freehand drawing
- **Inngest:** Async job queue for video processing pipeline — serverless-native, works on Vercel
- **Clerk:** Auth with native coach/player org/role differentiation
- **Zustand 5:** Lightweight state management for annotation canvas state
- **Vercel:** Frontend + API routes hosting; edge functions for low-latency

**Avoid:** AWS S3 (egress costs), OpenCV in Node.js (poor bindings), raw WebRTC (ops nightmare), FFmpeg on Vercel (serverless timeout), Firebase (weak role management for relational coach-athlete data).

### Expected Features

The feature research benchmarks against Hudl, Coach's Eye, Dartfish, and Tempo. The core workflow (upload → annotate → deliver → review) is table stakes. Softball-specific AI and side-by-side comparison are the true differentiators. Anything beyond mechanics analysis (team management, payments, social features, native app) is explicit scope creep in v1.

**Must have (table stakes):**
- Video upload from camera roll, portrait + landscape support
- Frame-by-frame scrubbing, slow motion playback (0.25x, 0.5x)
- Video library organized by athlete / date / type (hitting or pitching)
- Session history accessible by both coach and player
- Drawing tools: freehand pen, arrows, lines, angle measurement, text overlays, frame capture
- Written coaching notes attached to sessions
- Email notification when feedback is ready
- Coach and player roles with separate UIs and permissions
- Athlete roster management
- Secure video access — players see only their own; coaches see their roster

**Should have (competitive differentiators):**
- MediaPipe pose skeleton overlay on video (any frame)
- Joint angle computation: hip rotation, elbow slot, shoulder tilt
- Hitting-specific checkpoints: stance, load, stride, contact, follow-through
- Pitching-specific checkpoints: arm circle, hip-shoulder separation, release, finish
- Side-by-side player vs. reference video with synchronized scrubbing
- Async session mode (player submits, coach reviews on own schedule)
- Live session mode (coach and player review video together with shared annotations)

**Defer (v2+):**
- Automated mechanics scoring and issue flags
- Drill recommendations linked to coaching cues
- Progress tracking charts across sessions
- Custom coach-curated reference video library
- Payments and subscription management
- Native mobile app

### Architecture Approach

The architecture is a four-layer system: Client (Player UI, Coach UI, Live Session UI), API/BFF (Next.js API routes + Supabase), Async Processing (transcoding worker + AI analysis worker + notification dispatcher), and Data/Storage (Supabase Postgres + Supabase/R2 storage + CDN). The most important structural decision is that ALL video processing is offloaded to async workers — never executed in API routes. Row Level Security in Postgres is the authoritative access control layer; Next.js route middleware is supplementary UX-only protection.

**Major components:**
1. **Player UI** — Video upload flow (mobile-first, 3 steps max), feedback inbox with annotated video replay
2. **Coach UI** — Session queue, video review workspace with canvas annotation overlay, feedback composer and delivery controls
3. **Async Processing Pipeline** — Job queue (Inngest) → transcoding worker (Mux/FFmpeg) → AI analysis worker (MediaPipe BlazePose, Python or Node.js) → notification dispatcher (Resend)
4. **Supabase Postgres with RLS** — CoachingSession, PoseAnalysis, FeedbackPackage entities; RLS policies enforce coach-owns-sessions and player-sees-own-feedback boundaries
5. **Canvas Annotation Engine** — Fabric.js overlay synced to video `currentTime`; annotations stored as time-indexed JSON in Postgres, never burned into video
6. **Live Session Module** — WebRTC room (LiveKit or Daily.co) sharing session ID with async data model; canvas drawing synced via data channel

### Critical Pitfalls

1. **Video processing in serverless functions** — Transcoding and pose detection take 60–120 seconds, exceeding all serverless timeouts. Implement async job queue (Inngest) in Phase 1 before any AI or transcoding work. API routes return `202 Accepted` and enqueue; workers do the actual processing.

2. **Video egress cost explosion** — S3 direct delivery at $0.09/GB creates hundreds of dollars/month in bandwidth before any revenue. Use Cloudflare R2 (zero egress) from day one. This is an architectural decision that is expensive to migrate away from.

3. **MediaPipe accuracy on softball motion** — BlazePose was trained on fitness/yoga, not windmill pitching or full-rotation swings. Use the `HEAVY` model variant, apply visibility confidence thresholding (>0.6), smooth keypoints across 3 frames. Frame all AI outputs as coach-confirmable estimates, not automated verdicts. Test with real softball video before shipping.

4. **Burning annotations into video** — Re-encoding on every coach annotation save creates 30–90 second wait cycles and makes iteration impossible. Annotations are time-indexed JSON stored in Postgres, replayed as canvas overlay. This decision must be made before building the annotation system.

5. **Coach adoption blocked by complex player upload flow** — If players face more than 3 steps, account creation requirements, or app installs, they don't submit. Player submission should work with magic link or SMS code (no account required in v1), from mobile browser, with background upload (player can leave the page). Test on Android Chrome and iOS Safari.

6. **Video sync drift in side-by-side mode** — Two HTML5 video elements drift 100–300ms over 60 seconds. Use a single `requestAnimationFrame` loop as timing master, force `video2.currentTime = video1.currentTime` each frame. Standard browser auto-sync is insufficient for frame-accurate comparison.

---

## Implications for Roadmap

The architecture research identifies hard build-order dependencies. Auth enables everything. The video pipeline must be validated end-to-end before annotation complexity is added. AI analysis builds on working video storage. Annotation builds on working video player. The async loop must close (feedback delivery) before live sessions make sense. Side-by-side comparison is additive.

### Phase 1: Foundation — Auth, Upload, and Video Pipeline

**Rationale:** Every subsequent feature depends on knowing who the user is (coach vs. player) and having a working video upload-transcode-playback pipeline. The async job queue must be wired here, before any AI work, or it will be retrofitted under pressure. Video egress cost protection (Cloudflare R2 / Mux) must be chosen now — wrong choice is expensive to migrate.

**Delivers:** Working video upload from mobile browser, transcoding to HLS, basic video player, coach/player auth with role separation, athlete roster management.

**Addresses features:** Video upload, video library, frame-by-frame scrubbing, slow motion playback, coach + athlete roles, athlete roster, session history (read-only).

**Avoids pitfalls:** Serverless timeout (Inngest job queue from day one), video egress costs (Cloudflare R2 + Mux), portrait video handling (Mux rotation metadata), coach adoption friction (mobile-first 3-step player upload).

**Research flag:** Standard patterns — well-documented. Inngest + Supabase + Mux integrations have solid documentation.

### Phase 2: Coach Annotation Workspace

**Rationale:** With a working video pipeline, the core coaching value delivery can be built. Annotation canvas architecture must be decided here (JSON overlay, not burned-in video) — this decision cannot be changed later without rebuilding the feature. Canvas performance on mobile/iPad must be tested with real devices before shipping.

**Delivers:** Coach review workspace with video player + canvas annotation overlay (drawing tools, arrows, angles, text), written coaching notes, feedback delivery to player, player feedback inbox, email notification.

**Addresses features:** All annotation tools (freehand, arrows, lines, angles, text, frame capture), coaching notes, email notification when feedback ready, athlete view of feedback, secure video access.

**Avoids pitfalls:** Annotations stored as time-indexed JSON in Postgres (never burned into video), canvas performance with layered canvas approach (in-progress vs. saved annotations), mobile performance testing on real iPads before shipping.

**Research flag:** Standard patterns for annotation architecture. Canvas performance on mobile is a known concern — test early.

### Phase 3: AI Pose Analysis Layer

**Rationale:** Builds on working video storage. MediaPipe analysis runs as an async job post-upload. This is the primary differentiator — softball-specific keypoint extraction and joint angle computation. Must be validated with real softball video (not yoga/fitness demos) before shipping. Coach interprets AI data; no automated flags fired in v1.

**Delivers:** Pose skeleton overlay on video at any frame, joint angle display (hip rotation, elbow slot, shoulder tilt), hitting and pitching checkpoint views, AI-flagged frame indicators in timeline for coach reference.

**Addresses features:** Pose detection overlay, joint angle computation, hitting-specific checkpoints, pitching-specific checkpoints.

**Avoids pitfalls:** MediaPipe accuracy issues (HEAVY model, confidence thresholding >0.6, 3-frame keypoint smoothing, coach-confirmable output framing), AI analysis in async worker not API route.

**Research flag:** NEEDS DEEPER RESEARCH. MediaPipe accuracy on windmill pitching and full-rotation softball swings is unverified. Recommend `/gsd:research-phase` on softball pose detection accuracy and keypoint smoothing strategies before building the AI worker.

### Phase 4: Side-by-Side Comparison

**Rationale:** Natural extension of the video player after the AI layer is working. The reference video follows the same upload/transcode pipeline. Video sync drift is a known hard problem — implement rAF-based sync master from the start, not after drift is reported.

**Delivers:** Side-by-side player vs. reference video with synchronized scrubbing, shared annotation overlay, optional ghost/overlay mode.

**Addresses features:** Player vs. reference comparison, synchronized scrubbing.

**Avoids pitfalls:** Video sync drift (rAF timing master, force secondary video currentTime every frame).

**Research flag:** Standard approach with known implementation pattern. No additional research needed.

### Phase 5: Live Session Mode

**Rationale:** Live sessions share the `CoachingSession` data model with async sessions — building this after async is solid means the session entity, annotation storage, and player inbox are already in place. Only the real-time transport layer (WebRTC via LiveKit or Daily.co) is new. Building live sessions as a separate system (separate data model, separate session entity) is an explicit anti-pattern from research.

**Delivers:** Live coaching room where coach and player review video together with real-time shared canvas drawing and voice, post-session annotation save to async feedback package.

**Addresses features:** Live session mode, shared cursor/annotation, real-time coaching.

**Uses stack:** LiveKit or Daily.co (managed WebRTC, TURN/STUN included), Liveblocks or PartyKit for presence/canvas sync, shared `CoachingSession` entity with `mode: live`.

**Research flag:** NEEDS DEEPER RESEARCH. WebRTC integration for live drawing sync over data channels has real complexity. Recommend `/gsd:research-phase` on LiveKit/Daily.co SDK integration and data channel canvas sync patterns before building.

### Phase Ordering Rationale

- Auth and video pipeline come first because they are dependencies for everything else — there is no other valid starting point.
- Annotation canvas comes second because it is the primary coach workflow and closes the async feedback loop, delivering the core product value.
- AI analysis is third because it requires working video storage but produces the primary differentiator; validating MediaPipe accuracy on softball video early prevents building on a broken foundation.
- Side-by-side comparison extends the video player naturally and is lower-risk than live sessions.
- Live sessions come last because they share the session data model — the async system being solid makes live sessions additive, not a parallel build.

### Research Flags

Phases needing deeper research during planning:
- **Phase 3 (AI Pose Analysis):** MediaPipe accuracy on softball-specific motions (windmill pitch, full-rotation swing) is unverified. Need keypoint smoothing strategy validation and softball video benchmarking before building the AI worker.
- **Phase 5 (Live Sessions):** WebRTC data channel canvas sync complexity. LiveKit vs. Daily.co API differences matter for the drawing sync implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Inngest + Supabase + Mux + Clerk integration patterns are well-documented with official examples.
- **Phase 2 (Annotation):** Canvas-overlay annotation with time-indexed JSON is established; performance mitigation patterns are documented.
- **Phase 4 (Side-by-Side):** rAF-based video sync pattern is a known implementation; reference implementations exist.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified for Supabase + Next.js + Mux + Inngest + MediaPipe; all libraries actively maintained |
| Features | HIGH | Benchmarked against Hudl, Coach's Eye, Dartfish, Tempo; competitive gap analysis is clear |
| Architecture | HIGH | Multiple sources confirm async job queue requirement; Supabase RLS patterns verified against official docs; data model is straightforward |
| Pitfalls | HIGH | All critical pitfalls are based on known failure modes with documented prevention strategies; MediaPipe accuracy gap is a real, documented limitation |

**Overall confidence:** HIGH

### Gaps to Address

- **MediaPipe softball accuracy:** The HEAVY model variant with confidence thresholding and frame smoothing is the recommended mitigation, but actual accuracy on softball video is unvalidated. Validate with real softball video clips during Phase 3 spike before committing to full AI worker build.
- **Canvas library choice (Fabric.js vs. Konva.js):** STACK.md recommends Fabric.js; ARCHITECTURE.md mentions Konva.js as preferred for React integration and dynamic updates. Resolution: prototype both in Phase 2 spike, prefer Konva.js if React integration ergonomics matter, Fabric.js if SVG export or annotation primitive breadth is priority.
- **Live session WebRTC provider (LiveKit vs. Daily.co):** Both are viable managed WebRTC providers. LiveKit is open-source-core and more configurable; Daily.co is simpler to integrate. Validate pricing and data channel API before Phase 5.
- **Player account model:** Research recommends magic-link or SMS-code submission without account creation for v1, but long-term session history for players requires persistent identity. Clarify whether v1 includes player accounts or truly account-free submission.

---

## Sources

### Primary (HIGH confidence)
- Supabase official docs (Row Level Security, Storage Access Control) — RLS patterns, signed URLs
- MediaPipe official documentation — BlazePose model variants, HEAVY model, visibility confidence
- Inngest official docs + blog — background job patterns for Next.js on Vercel
- Mux official docs — direct upload, HLS transcoding, webhook callbacks

### Secondary (MEDIUM confidence)
- MobiDev: Human Pose Estimation for Fitness and Sports Apps — architecture patterns for sports pose detection
- GetStream: WebRTC Architecture — SFU/TURN patterns for live coaching
- PedroAlonso.net: Background Jobs with Next.js + BullMQ — job queue architecture patterns
- Roboflow Blog: Best Pose Estimation Models — MediaPipe vs. OpenPose vs. custom model tradeoffs
- it-jim.com: MediaPipe for Sports Apps — accuracy limitations and mitigation strategies

### Tertiary (LOW confidence — verify during implementation)
- Konva.js vs. Fabric.js comparison (dev.to) — library selection tradeoffs; needs hands-on prototype to confirm for this use case
- Video sync drift mitigation via rAF — community-documented pattern, not from official browser spec

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
