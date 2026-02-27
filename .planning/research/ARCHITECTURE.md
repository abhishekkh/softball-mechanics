# Architecture Research

**Domain:** Sports video analysis coaching platform (softball mechanics)
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH (confirmed against multiple sources; specific Supabase + Next.js patterns verified against official docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Player UI   │  │   Coach UI   │  │  Live Session│               │
│  │  (upload,    │  │  (annotate,  │  │  (WebRTC     │               │
│  │   receive    │  │   review,    │  │   screen +   │               │
│  │  feedback)   │  │   deliver)   │  │   live draw) │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
├─────────┴─────────────────┴─────────────────┴────────────────────────┤
│                        API / BFF LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │         Next.js API Routes + Supabase Client                 │    │
│  │  (auth, sessions, annotations, notifications, upload URLs)   │    │
│  └──────────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────┤
│                      ASYNC PROCESSING LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Video       │  │  AI Analysis │  │  Notification│               │
│  │  Transcoding │  │  Worker      │  │  Dispatcher  │               │
│  │  (FFmpeg /   │  │  (pose       │  │  (email,     │               │
│  │  MediaConvert│  │  detection + │  │   push, in-  │               │
│  │  + HLS)      │  │  mechanics   │  │   app)       │               │
│  │              │  │  scoring)    │  │              │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
├─────────┴─────────────────┴─────────────────┴────────────────────────┤
│                        DATA + STORAGE LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Supabase    │  │  Supabase    │  │  CDN         │               │
│  │  Postgres    │  │  Storage     │  │  (CloudFront │               │
│  │  (sessions,  │  │  (raw video, │  │   or Supabase│               │
│  │  users,      │  │  processed,  │  │   CDN)       │               │
│  │  feedback,   │  │  thumbnails) │  │              │               │
│  │  pose data)  │  │              │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Player UI | Video upload, submission form, feedback inbox | Next.js + React |
| Coach UI | Video review, annotation canvas, feedback composer, session delivery | Next.js + React + Konva.js |
| Live Session UI | Real-time shared video playback + live drawing overlay | WebRTC + canvas overlay |
| API / BFF Layer | Auth, CRUD for sessions and feedback, signed upload URLs | Next.js API Routes + Supabase |
| Video Transcoding Worker | Convert uploaded video to HLS adaptive streaming, generate thumbnails | FFmpeg (self-hosted) or AWS MediaConvert |
| AI Analysis Worker | Run pose detection on video frames, extract softball-specific keypoints, score mechanics | Python worker + MediaPipe BlazePose |
| Notification Dispatcher | Alert players when feedback is ready; alert coaches of new submissions | Supabase Edge Function or background worker |
| Supabase Postgres | Users, roles, sessions, analysis results, annotations, feedback packages | Postgres with RLS |
| Supabase Storage | Raw uploaded videos, transcoded HLS segments, thumbnails, annotation exports | S3-compatible object storage with signed URLs |
| CDN | Low-latency video delivery to players and coaches | Supabase CDN or CloudFront |

## Recommended Project Structure

```
softball-mechanics/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Login, signup, role selection
│   ├── (player)/                # Player-scoped pages
│   │   ├── upload/              # Video submission flow
│   │   └── feedback/[id]/       # Receive and view feedback
│   ├── (coach)/                 # Coach-scoped pages
│   │   ├── sessions/            # Session queue / inbox
│   │   ├── review/[sessionId]/  # Video review + annotation workspace
│   │   └── deliver/[sessionId]/ # Finalize and send feedback
│   ├── (live)/                  # Live session room
│   │   └── [roomId]/            # WebRTC room with shared video
│   └── api/                     # API routes
│       ├── upload/              # Generate signed upload URL
│       ├── sessions/            # CRUD for coaching sessions
│       ├── analysis/            # Trigger and poll AI analysis
│       └── webhooks/            # Receive processing job callbacks
├── components/
│   ├── video/                   # VideoPlayer, SlowMo, SideBySide
│   ├── annotation/              # Canvas overlay, draw tools, timeline
│   ├── feedback/                # CoachingCues, FeedbackPacket display
│   └── ui/                      # Shared design system components
├── lib/
│   ├── supabase/                # Supabase client, server, RLS helpers
│   ├── video/                   # Upload helpers, HLS utilities
│   └── analysis/                # Pose data parsing, mechanics scoring
├── workers/                     # Background job workers (separate deploy)
│   ├── transcoder/              # FFmpeg transcoding pipeline
│   └── pose-analysis/           # Python MediaPipe worker
├── supabase/
│   ├── migrations/              # DB schema migrations
│   └── functions/               # Edge functions (notifications)
└── public/
```

### Structure Rationale

- **`app/(player)` and `app/(coach)`:** Route group separation enforces role boundaries at the routing level; prevents accidental access to coach tools.
- **`workers/`:** AI analysis is CPU-bound and long-running (30–120 seconds per video). Deployed separately from the Next.js app; called via job queue rather than HTTP timeout.
- **`components/annotation/`:** Canvas annotation is complex enough to merit its own module; isolated from business logic.
- **`supabase/`:** Migrations and Edge Functions co-located with project for version control and reproducible deploys.

## Architectural Patterns

### Pattern 1: Async Job Queue for Video Processing

**What:** Video upload triggers a job enqueue. Workers (transcoding, AI analysis) pull from queue and process independently. Status updates flow back to the app via webhook or polling.

**When to use:** Any processing step that exceeds 30 seconds or requires CPU-intensive compute (transcoding, pose detection). Never in a Next.js API route — Vercel/serverless 60-second timeout is fatal here.

**Trade-offs:** Adds operational complexity (need a queue + worker process). Eliminates timeout failures entirely. Enables retry on failure. Required, not optional, for video pipelines.

**Example:**
```typescript
// app/api/upload/complete/route.ts — called after upload to Supabase Storage
export async function POST(req: Request) {
  const { sessionId, videoPath } = await req.json();

  // Enqueue transcoding job (Inngest, BullMQ, or Supabase Edge queue)
  await jobQueue.enqueue('transcode-video', {
    sessionId,
    inputPath: videoPath,
    outputFormats: ['hls', 'mp4'],
  });

  // Enqueue AI analysis job (runs after transcode completes)
  await jobQueue.enqueue('analyze-pose', {
    sessionId,
    videoPath,
    sport: 'softball',
    motionType: 'hitting', // or 'pitching'
  });

  return Response.json({ status: 'queued' });
}
```

### Pattern 2: Canvas-Synchronized Video Annotation

**What:** A transparent canvas overlay is rendered on top of the `<video>` element. Drawing state (shapes, arrows, timestamps) is tied to video `currentTime`. Annotations stored as a time-indexed JSON document, not as burned-in video.

**When to use:** Coach annotation workspace. Allows annotations to replay in sync with video during playback; players see drawings appear at the correct moment. Avoids expensive video re-encoding on every annotation edit.

**Trade-offs:** Requires frame-accurate `timeupdate` event handling (±33ms tolerance at 30fps). JSON annotation format is lightweight and editable. Konva.js recommended over Fabric.js for React integration (declarative component model, better performance for dynamic updates).

**Example:**
```typescript
// Annotation stored as JSON, not in the video file
type Annotation = {
  id: string;
  startTime: number;    // video seconds
  endTime: number;
  type: 'arrow' | 'circle' | 'line' | 'text';
  data: Record<string, unknown>; // shape-specific coords, color, etc.
};

// Canvas syncs on video timeupdate
videoEl.addEventListener('timeupdate', () => {
  const visible = annotations.filter(
    (a) => videoEl.currentTime >= a.startTime && videoEl.currentTime <= a.endTime
  );
  konvaLayer.destroyChildren();
  visible.forEach((a) => renderAnnotation(konvaLayer, a));
  konvaLayer.draw();
});
```

### Pattern 3: Role-Based Row Level Security (RLS)

**What:** Supabase Postgres RLS policies enforce access at the database level. Coaches see only their sessions; players see only their own submissions and the feedback delivered to them. No application-layer guard can be bypassed because the DB rejects unauthorized reads/writes.

**When to use:** Always — this is the primary access control mechanism. Never rely solely on route-level middleware.

**Trade-offs:** Policies require careful authoring and testing. Debugging RLS failures can be non-obvious. Worth the investment: prevents an entire class of data exposure bugs.

**Example:**
```sql
-- Players can only see sessions they submitted
CREATE POLICY "player_own_sessions" ON sessions
  FOR SELECT USING (
    auth.uid() = player_id
  );

-- Coaches can only see sessions assigned to them
CREATE POLICY "coach_own_sessions" ON sessions
  FOR SELECT USING (
    auth.uid() = coach_id
  );

-- Players can read feedback only after coach marks it delivered
CREATE POLICY "player_feedback_delivered" ON feedback
  FOR SELECT USING (
    auth.uid() = (SELECT player_id FROM sessions WHERE id = feedback.session_id)
    AND delivered_at IS NOT NULL
  );
```

## Data Flow

### Primary Flow: Async Coaching (Upload → Analyze → Annotate → Deliver)

```
[Player] Uploads video via browser
    ↓
[Supabase Storage] Receives raw video file (signed upload URL)
    ↓
[API Route] Records upload, updates session status to "uploaded"
    ↓
[Job Queue] Enqueues two jobs: transcode + analyze-pose
    ↓ (parallel)
[Transcoding Worker] FFmpeg → HLS segments + thumbnail → writes to Storage
[AI Analysis Worker] MediaPipe BlazePose → pose landmarks per frame
         → Mechanics scorer (softball-specific: hip rotation, stride, bat path)
         → Writes pose_analysis record to Postgres
    ↓
[Webhook / DB trigger] Session status updated to "ready_for_review"
    ↓
[Notification] Coach receives email/in-app: "New submission ready"
    ↓
[Coach] Opens review workspace
    → Watches HLS video with pose overlay (AI-flagged frames highlighted)
    → Draws annotations (arrows, circles, text) on canvas
    → Writes coaching cues (timestamped text notes)
    → Optionally adds side-by-side comparison video (pro/ideal form)
    → Clicks "Deliver Feedback"
    ↓
[API Route] Sets delivered_at on feedback record
    ↓
[Notification] Player receives email/in-app: "Feedback from Coach ready"
    ↓
[Player] Views annotated video + coaching cues in their inbox
```

### Secondary Flow: Live Session

```
[Coach] Creates live session room → receives room URL
    ↓
[Player] Joins room via shared link
    ↓
[WebRTC / LiveKit / Daily.co] Establishes peer connection
    → Shared video playback (coach controls playback, player watches)
    → Live canvas drawing overlay streamed as data channel (not video)
    → Voice/audio channel for real-time coaching cues
    ↓
[Session] Coach can save live session drawings to async feedback package
    ↓ (optional)
[Async flow] Post-session feedback delivered via standard async pipeline
```

### Key Data Entities and Flow

```
User (role: coach | player)
  ↓ coach creates
CoachingSession
  ├── player_id → User
  ├── coach_id  → User
  ├── video → Storage bucket path
  ├── status: [pending | uploaded | transcoding | analysis | ready | delivered]
  └── motion_type: hitting | pitching

  ↓ AI worker writes
PoseAnalysis
  ├── session_id → CoachingSession
  ├── keypoints_json (33 BlazePose landmarks per frame)
  ├── flags[] (detected mechanical issues)
  └── confidence_scores per flag

  ↓ coach writes
FeedbackPackage
  ├── session_id → CoachingSession
  ├── annotations[] (time-indexed JSON)
  ├── coaching_cues[] (timestamped text)
  ├── comparison_video_path (optional)
  └── delivered_at
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 users | Supabase free/pro tier, single worker process per type, Vercel for Next.js, no queue needed — just DB polling |
| 500-5k users | Dedicated queue (Inngest or BullMQ + Redis), separate worker containers (Railway or Fly.io), MediaConvert instead of self-hosted FFmpeg |
| 5k-50k users | Worker auto-scaling (containerized), CDN caching for processed videos, read replicas for Postgres, consider GPU workers for faster pose detection |
| 50k+ users | Microservice split (video service, analysis service, notification service), multi-region storage |

### Scaling Priorities

1. **First bottleneck — AI analysis worker:** Pose detection on full video is CPU-heavy (30–120 seconds per video). Scale this worker horizontally before anything else. GPU acceleration reduces this to 5–15 seconds.
2. **Second bottleneck — video storage egress:** As coach review and player playback grow, CDN bandwidth costs spike. Ensure HLS segments are served from CDN (not directly from Supabase Storage) from day one.
3. **Third bottleneck — Postgres connections:** Supabase uses PgBouncer by default; connection pooling is pre-configured. Becomes a concern after 1k concurrent active sessions.

## Anti-Patterns

### Anti-Pattern 1: Running Video Processing in API Routes

**What people do:** Upload video → call FFmpeg or pose detection model inside a Next.js API route handler.

**Why it's wrong:** Serverless function timeouts (Vercel: 60s max, 10s on Hobby). A 90-second softball swing video takes 60–120 seconds to transcode and analyze. Route times out; user sees error; processing may continue or silently die.

**Do this instead:** API route accepts upload, writes a job record to the DB, returns `202 Accepted` immediately. A separate worker process (not a serverless function) polls or receives the job and does the heavy work.

### Anti-Pattern 2: Burning Annotations Into the Video

**What people do:** After coach annotates, re-encode the video with drawings baked into the frames using FFmpeg.

**Why it's wrong:** Re-encoding a 2-minute video takes 30–90 seconds per annotate-edit cycle. Coaches iterate — they add a note, watch it back, revise. Each save triggering a transcode makes the UX unusable. You also lose the ability to show/hide annotations or edit them later.

**Do this instead:** Store annotations as time-indexed JSON (`{ startTime, endTime, shape, coords }`). Replay them on a canvas overlay during playback. Re-encode only if the player explicitly requests a video export (and even then, offer it as an async background job).

### Anti-Pattern 3: Treating Live and Async Sessions as Separate Systems

**What people do:** Build async feedback first, then build live sessions as a completely different codebase with its own session model, storage, and notification system.

**Why it's wrong:** Results in two codebases, two data models, coaches can't easily save a live session as an async feedback package, player inbox becomes fragmented.

**Do this instead:** Build one `CoachingSession` entity with a `mode` field (`async | live`). Live sessions use the same session ID; annotations made during live are saved to the same `FeedbackPackage` record. The delivery mechanism differs (real-time data channel vs. notification), but the storage and display are shared.

### Anti-Pattern 4: Client-Side-Only RLS via Route Guards

**What people do:** Protect coach routes with Next.js middleware, trust that players can't access `/coach/*` URLs.

**Why it's wrong:** Route guards prevent navigation but don't prevent direct API calls. A player can call `/api/sessions?coachId=X` and see another coach's sessions if the DB doesn't enforce access.

**Do this instead:** Enforce RLS policies in Postgres. Route guards are for UX; database policies are for security. Both must exist.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | JWT tokens, RLS `auth.uid()` | Handles magic link, social OAuth; roles stored in `user_metadata` |
| Supabase Storage | Signed upload URLs (client uploads directly, bypasses server) | Prevents server bandwidth bottleneck on large video uploads |
| MediaPipe BlazePose | Python worker calls MediaPipe on extracted frames | Single-person model; suitable for pitching/hitting video (one athlete per frame) |
| FFmpeg | Worker subprocess for HLS segmentation and thumbnail extraction | Self-hosted on Railway/Fly.io for small scale; AWS MediaConvert for scale |
| LiveKit or Daily.co | SDK integration for live session WebRTC | Managed TURN/STUN removes infra complexity; data channels for live drawing sync |
| Inngest or BullMQ | Job queue for async video pipeline | Inngest is serverless-native, easier on Vercel; BullMQ requires Redis |
| Resend / SendGrid | Transactional email for notifications | Coach submission alerts, player feedback-ready alerts |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js app ↔ AI Worker | Job queue (enqueue + webhook callback) | Never direct HTTP from API route to worker; queue decouples them |
| Next.js app ↔ Supabase | Supabase JS client (anon key with RLS on client; service role key on server only) | Never expose service role key to client |
| Coach annotation UI ↔ Video player | Event emitter / shared React context | Canvas must react to `timeupdate` without re-rendering video element |
| Async session ↔ Live session | Shared `CoachingSession` DB record | Mode field distinguishes; delivery path differs but data model is unified |
| AI Worker ↔ Postgres | Direct Postgres write (service role) | Worker writes `pose_analysis` record; triggers status update via DB trigger or webhook |

## Build Order Implications

The data flow creates hard dependencies between components. Build in this order:

1. **Auth + role system** — Everything depends on knowing who coach vs. player is.
2. **Video upload + Supabase Storage** — Core pipeline starts here; must work before analysis can run.
3. **Transcoding worker** — Players need watchable HLS video before coaches can review.
4. **Basic coach review UI** (video player only, no annotation yet) — Validates the pipeline is working end to end before adding annotation complexity.
5. **AI pose analysis worker** — Builds on working video storage; outputs feed the annotation layer.
6. **Annotation canvas** — Requires working video player and existing session data.
7. **Feedback delivery + player inbox** — Final async loop closes here.
8. **Live session (WebRTC)** — Technically independent, but sharing the session data model with async makes it much simpler; build after async is solid.
9. **Side-by-side comparison** — Additive feature on top of working video player; build last.

## Sources

- [MediaPipe for Sports Apps: Architecture and Limitations](https://www.it-jim.com/blog/mediapipe-for-sports-apps/)
- [How to Build a Video Processing Pipeline on AWS](https://oneuptime.com/blog/post/2026-02-12-build-video-processing-pipeline-on-aws/view)
- [Human Pose Estimation for Fitness and Sports Apps — MobiDev](https://mobidev.biz/blog/human-pose-estimation-technology-guide)
- [Best Pose Estimation Models and Deployment — Roboflow Blog](https://blog.roboflow.com/best-pose-estimation-models/)
- [WebRTC Architecture — Building a Conferencing App P2P, SFU, MCU](https://getstream.io/blog/building-a-conferencing-app/)
- [Supabase Storage Access Control — Official Docs](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Row Level Security — Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Konva.js vs Fabric.js Comparison for Canvas Apps](https://dev.to/xingjian_hu_123dc779cbcac/konvajs-vs-fabricjs-in-depth-technical-comparison-and-use-case-analysis-3k7l)
- [Background Job Processing with Next.js — BullMQ + Redis](https://www.pedroalonso.net/blog/advanced-background-jobs-nextjs-bull-redis/)
- [Inngest: Background functions for Next.js on Vercel](https://www.inngest.com/blog/run-nextjs-functions-in-the-background)

---
*Architecture research for: softball mechanics coaching platform*
*Researched: 2026-02-26*
