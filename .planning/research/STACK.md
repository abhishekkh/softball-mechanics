# Stack Research: Softball Mechanics Coaching App

**Domain:** Sports video analysis coaching platform
**Date:** 2026-02-26
**Confidence:** High (established patterns, verified against known library docs)

---

## Recommended Stack

### Frontend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 19 + Next.js 15** | App Router for routing, server components reduce JS bundle, strong ecosystem for media apps |
| Styling | **Tailwind CSS 4** | Utility-first, fast iteration, no CSS files to manage |
| Video Player | **Video.js 8** or **Vidstack 1.x** | Both support frame-by-frame scrubbing (critical for mechanics review), HLS streaming, mobile |
| Canvas/Annotation | **Fabric.js 6** | Battle-tested canvas library — supports drawing tools, lines, angles, overlays on video frames |
| Real-time | **Liveblocks** or **PartyKit** | Multiplayer presence for live coaching sessions; abstracts away WebSocket complexity |
| State | **Zustand 5** | Lightweight, works well with canvas/annotation state |

**Why Fabric.js over Konva:** Fabric.js has better SVG export and more annotation primitives (arrows, angles, freehand). Konva is faster for games but overkill here.

**Why NOT React Native for v1:** Web-first avoids dual codebase. Mobile browsers handle video + canvas adequately for v1. Add native later.

---

### Backend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | **Node.js 22 + TypeScript** | Team familiarity, strong video ecosystem |
| Framework | **Fastify 5** or **Next.js API routes** | Fastify for high-throughput video upload endpoints; Next.js API routes fine for simpler CRUD |
| Auth | **Clerk** or **Auth.js v5** | Clerk handles coach/player role differentiation natively with orgs; Auth.js if you want OSS |
| Database | **PostgreSQL (Supabase)** | Relational for coach-player relationships, session data; Supabase adds realtime subscriptions |
| ORM | **Drizzle ORM** | Type-safe, lightweight, works well with Postgres |
| Job Queue | **Inngest** or **BullMQ** | AI analysis runs async post-upload; Inngest has better DX for serverless |

---

### AI / Pose Detection

| Choice | Rationale | Confidence |
|--------|-----------|------------|
| **MediaPipe Pose (Holistic)** | Google-backed, runs in-browser (WASM) or server-side, 33-point body landmarks, no API cost | High |
| **OpenPose** | More accurate but requires GPU server, higher ops overhead — overkill for v1 | Not recommended for v1 |
| **Roboflow + custom model** | If softball-specific accuracy needed beyond MediaPipe — train on softball swing datasets | V2 consideration |

**MediaPipe approach:**
- Run in-browser for near-instant feedback (WASM, ~2MB download)
- Extract keypoints server-side via `@mediapipe/tasks-vision` Node.js package for storage/analysis
- Key points for softball: wrists, elbows, shoulders, hips, knees — compute joint angles

**Softball-specific angle detection:**
- Hitting: hip rotation angle, elbow slot, bat path angle, load position
- Pitching: arm circle angle, hip-shoulder separation, stride length ratio

---

### Video Storage & Processing

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Upload | **Uploadthing** or **Mux Direct Uploads** | Both handle chunked upload, resumable, progress events |
| Storage | **Cloudflare R2** | S3-compatible, no egress fees (critical — video bandwidth costs compound fast) |
| Processing/Transcoding | **Mux** | Handles transcoding to HLS, thumbnail generation, per-second pricing; avoids running FFmpeg yourself |
| CDN delivery | **Cloudflare** (via R2) | Co-located with R2, fast global delivery |

**Why Mux over AWS MediaConvert:** Mux has a dead-simple API, built-in HLS, and webhooks when processing is complete. MediaConvert requires IAM config, CloudFront, Lambda — significant ops overhead.

**Why Cloudflare R2 over S3:** No egress fees is the single biggest cost driver for video apps. R2 saves ~90% on bandwidth vs S3.

---

### Side-by-Side Comparison

| Choice | Rationale |
|--------|-----------|
| **Custom canvas compositor** (Fabric.js) | Sync two video playheads at frame level, overlay keypoints. Not a library problem — build it. |
| Reference video library | Store coach-curated reference clips (pro swings) in R2, same pipeline |

---

### Notifications

| Choice | Rationale |
|--------|-----------|
| **Resend** (email) | Simple API, great DX, transactional email when feedback is ready |
| **Knock** or **Novu** | In-app + email notification routing if you want a notification center UI |

---

### Infrastructure

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Hosting | **Vercel** (frontend + API routes) | Easiest Next.js deployment, edge functions for low-latency |
| AI inference | **Modal** or **Replicate** | Serverless GPU for heavier model inference if needed in v2 |
| Monitoring | **Sentry** | Error tracking across frontend and backend |

---

## What NOT to Use

| Avoid | Why |
|-------|-----|
| **AWS S3 for video delivery** | Egress costs will destroy budget at scale |
| **Custom WebRTC for live sessions** | Use Liveblocks/PartyKit abstractions — raw WebRTC is an ops nightmare |
| **OpenCV in Node.js** | Poor bindings, use MediaPipe instead |
| **Firebase** | Realtime DB not suited for relational coach-player data; auth is weaker for role management |
| **FFmpeg on Vercel** | No persistent compute, serverless timeout too short for video processing |

---

## Summary

**Core v1 stack:**
- **Frontend:** Next.js 15 + Fabric.js (annotation) + Video.js (playback) + Zustand
- **Backend:** Supabase (DB + auth-adjacent) + Clerk (auth/roles) + Inngest (job queue)
- **Video:** Mux (transcoding/streaming) + Cloudflare R2 (storage)
- **AI:** MediaPipe Pose (in-browser WASM + server-side keypoint extraction)
- **Deploy:** Vercel

This stack is deployable by one developer, has no ops complexity in v1, and has clear upgrade paths (swap MediaPipe for custom model in v2, add Modal for GPU inference, etc.).
