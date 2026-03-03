# Diamond Mechanics Coaching App

## What This Is

A video-based softball (and baseball) mechanics coaching platform for travel and competitive athletes. Coaches upload or receive athlete hitting and pitching videos; AI automatically flags mechanical issues with pose skeleton overlay and joint angle analysis; coaches review AI flags and Gemini Flash commentary, then deliver branded feedback emails directly to athletes — enabling remote coaching between sessions.

## Core Value

Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.

## Requirements

### Validated

- ✓ Coach can create an account with email and password — v1.0
- ✓ Coach can log in and stay logged in across browser sessions (edge-layer auth working) — v1.0
- ✓ Coach can invite an athlete via a shareable link (PKCE invite flow) — v1.0
- ✓ Athlete can access their submissions and feedback via invite link / magic link — v1.0
- ✓ Coach or athlete can upload a video from their camera roll (phone or desktop) — v1.0
- ✓ Uploaded video is transcoded to HLS for smooth streaming playback — v1.0
- ✓ Pose skeleton overlay rendered on video frames via MediaPipe body landmarks — v1.0
- ✓ Joint angles automatically computed (hip rotation/drive, elbow/arm slot, shoulder tilt) — v1.0
- ✓ AI flags potential mechanics issues (dropping elbow, early hip rotation, bat casting, premature shoulder opening, arm circle, stride off power line) with confidence score — v1.0
- ✓ Coach invites an athlete and athlete receives branded Resend invite email with embedded generateLink() action URL — v1.0
- ✓ Coach can send feedback email to athlete from review page with VLM summary and auto-authenticating magic link to /submissions — v1.0
- ✓ Coach can view their athlete roster — v1.0
- ✓ Coach can invite athlete to roster via shareable link — v1.0
- ✓ App renamed "Diamond Mechanics" everywhere — v1.0
- ✓ Diamond blue brand color cascades app-wide — v1.0
- ✓ Public landing page at root URL — v1.0
- ✓ App shell nav and auth pages rebranded — v1.0
- ✓ Per-page metadata, favicon, OG image — v1.0

### Active

- [ ] Coach can annotate video frames (freehand draw, lines, arrows, angle overlay, text labels)
- [ ] Annotations are saved as time-indexed JSON and replay in sync with video
- [ ] Coach can add written coaching cues tied to specific timestamps
- [ ] Athlete can view feedback package (annotations + coaching cues) in their inbox
- [ ] Coach can scrub video frame-by-frame and play at slow motion speeds (0.25x, 0.5x)
- [ ] Coach can view session history for a specific athlete
- [ ] Coach can load a reference video and compare side-by-side with athlete's video, with synchronized scrubbing

### Out of Scope

| Feature | Reason |
|---------|--------|
| Payments / subscriptions | Validate coaching workflow before adding billing complexity |
| Native mobile app | Web-first; mobile browser sufficient for v1 |
| Fielding / base running analysis | Different pose models needed; hitting + pitching is v1 scope |
| Full team management (schedules, lineups, game stats) | Out of domain — this is a mechanics coaching tool |
| Social / community features | Not a social network |
| In-app video recording | Camera roll upload sufficient; in-app recording adds permission complexity |
| Parent portal | Coach ↔ athlete is the core relationship for v1 |
| Video editing (cuts, highlights, exports) | Not a video editor |

## Context

- Target users: travel/competitive softball (and baseball) coaches and their athletes
- v1.0 shipped 2026-03-03 — core upload → AI analysis → feedback email loop working
- Codebase: ~6,464 TypeScript lines (Next.js 16 App Router), 214 files, 84 Vitest tests
- Tech stack: Next.js 16, Supabase (auth + DB), Cloudflare R2 (video), Inngest (jobs), MediaPipe (pose), Gemini Flash (VLM commentary), Resend (email), HLS.js
- Known tech debt before v2: placeholder OG image, landing page copy inaccuracy ("no login required"), landing page missing "Go to dashboard" CTA for authenticated users, yolo-pose.worker.ts dead code
- v2 focus: annotation workspace and structured feedback delivery (Phase 3)

## Constraints

- **Scope**: v1 is the core upload → analyze → feedback loop; annotations and athlete inbox are v2
- **Sport specificity**: AI analysis is hitting + pitching specific (windmill, batting stance/swing)
- **Platform**: Web-first; mobile browser for upload, desktop for coach review

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hitting + pitching only (v1) | Broadest impact, most requested coaching areas | ✓ Good — coaches want both |
| AI + coach hybrid analysis | AI surfaces issues fast; coach adds nuance and context | ✓ Good — Gemini commentary adds real value |
| Async only (v1) | Remote between sessions AND in-person use cases; live deferred to v2 | ✓ Good — async is core use case |
| Cloudflare R2 for video storage | Zero egress fees; S3-compatible presign API | ✓ Good — cost-effective at scale |
| Inngest for transcoding | Serverless job queue; steps survive Lambda cold starts | ✓ Good — reliable pipeline |
| MediaPipe as primary pose model | Browser-side WASM, no server GPU needed | ✓ Good — passes evaluation on softball video |
| Gemini Flash as optional VLM overlay | Adds qualitative commentary; not a replacement for pose detection | ✓ Good — coaches find it useful |
| Resend for email delivery | Free tier 3,000/month; athlete email already in coach_athletes; no phone/carrier burden | ✓ Good — replaced Twilio SMS plan |
| generateLink() for email CTAs | Admin API returns real action_link for embedding in branded emails | ✓ Good — eliminates auth bounce for athletes |
| Annotations in v2 (Phase 3) | Validate core AI analysis workflow before building annotation editor complexity | — Pending v2 |
| Decimal phase numbering (2.1, 2.2...) | Clear insertion semantics for urgent gap phases | ✓ Good — unambiguous ordering |

---
*Last updated: 2026-03-03 after v1.0 milestone*
