# Pitfalls Research: Softball Mechanics Coaching App

**Domain:** Sports video analysis coaching platform
**Date:** 2026-02-26

---

## Critical Pitfalls

### 1. Running Video Processing in Serverless Functions

**What happens:** Developer puts FFmpeg or MediaPipe inside a Next.js API route or Lambda. Works in development (no timeout), fails silently in production when a 90-second softball video hits the 60-second serverless limit.

**Warning signs:**
- Video analysis "sometimes works" in dev but fails in prod
- Users report videos stuck in "Processing..." forever
- No error in logs — the function just timed out

**Prevention:**
- Use an async job queue (Inngest, BullMQ) from day one
- API route accepts upload, returns `202 Accepted`, enqueues job
- Worker (separate long-running process) handles the actual processing
- **Phase:** Implement job queue in Phase 1 before any AI work

---

### 2. Video Egress Cost Explosion

**What happens:** App uses AWS S3 or Supabase Storage for video delivery. At $0.09/GB egress, a single 100MB coaching session watched 20x (coach + athlete + re-reviews) = $0.18. At 500 active athletes, that's hundreds of dollars/month in egress alone before you have a single paying customer.

**Warning signs:**
- Monthly AWS bill growing faster than user count
- Video delivery costs > hosting costs
- Coach reviews sessions multiple times (as expected)

**Prevention:**
- Use **Cloudflare R2** from day one — zero egress fees
- Or serve HLS segments through **Cloudflare CDN** in front of S3
- Never serve raw video directly from S3 origin
- **Phase:** Architecture decision in Phase 1 — wrong choice is expensive to migrate

---

### 3. MediaPipe Accuracy on Softball-Specific Motion

**What happens:** MediaPipe BlazePose was trained on general human poses (yoga, fitness). Softball mechanics — particularly the windmill pitching motion and full-rotation swing — push the model outside its training distribution. Keypoints lose tracking during fast motion or unusual arm positions.

**Warning signs:**
- Skeleton overlay "jumps" during the fastest part of the swing/pitch
- Elbow and wrist landmarks frequently swap or go invisible
- Joint angles compute to obviously wrong values (e.g., -30° hip rotation)

**Prevention:**
- Use MediaPipe's `HEAVY` model variant (slower but more accurate) for stored video analysis
- Add confidence thresholding — only display landmarks with visibility > 0.6
- Smooth keypoints across frames (moving average over 3 frames) before computing angles
- Mark AI-computed angles as "estimates" in the UI — coach confirms/overrides
- Don't fire mechanical "flags" automatically in v1; let coach interpret the data
- **Phase:** Phase 3 (AI layer) — test with actual softball videos before shipping

---

### 4. Annotation Canvas Performance on Mobile

**What happens:** Coaches often annotate on iPad or large phone. Fabric.js canvas with many objects + video playback synchronization causes dropped frames and janky scrubbing. On lower-end iPads, this can make the coach workspace essentially unusable.

**Warning signs:**
- Scrubbing feels sluggish when annotations are present
- Drawing lag on touch screens (annotation appears ~200ms after pen lift)
- Memory warnings from browser on mobile

**Prevention:**
- Separate canvas layers: one for "in-progress drawing" (updated every frame), one for "saved annotations" (only updated on seek)
- Limit annotations per session — soft cap of 20-30 objects recommended
- Use `requestAnimationFrame` for canvas redraws, never synchronous
- Test on iPad (Air generation, not Pro) before shipping annotation feature
- **Phase:** Phase 2 (annotation) — performance test on real devices, not simulators

---

### 5. Video Sync Drift in Side-by-Side Mode

**What happens:** Two HTML5 `<video>` elements playing simultaneously drift out of sync by 100-300ms over a 60-second clip. Frame-perfect comparison (the core feature) becomes impossible because the player's swing and the reference swing are slightly offset.

**Warning signs:**
- "Synchronized" videos look off after 10-20 seconds
- Frame numbers don't match between the two players
- Users report comparison is "off"

**Prevention:**
- Use a single `requestAnimationFrame` loop as the timing master
- Each frame: read `video1.currentTime`, force `video2.currentTime = video1.currentTime`
- This "nudges" the secondary video to stay in sync (acceptable at 30fps cadence)
- Disable browser's native buffering-driven catch-up on the secondary video
- Test with videos of different encoding profiles (frame rates can differ: 24fps vs 60fps)
- **Phase:** Phase 4/5 (side-by-side) — requires dedicated sync implementation

---

### 6. Coach Adoption Friction from Complex Upload Flow

**What happens:** Coaches ask players to upload video. If the upload flow requires account creation, app install, or more than 3 steps on mobile, players don't do it. Coaches get no submissions, see no value, churn.

**Warning signs:**
- Low submission rate after coach sends invite link
- Players say "I tried but couldn't figure it out"
- Coaches complain that players "won't use it"

**Prevention:**
- Player submission should work without an account for v1 (magic link or SMS code)
- Upload should work from mobile browser (no app install required)
- Upload UI: one screen — pick video, add notes (optional), submit. Done.
- Video should upload in the background (player can leave the page)
- Test the full player flow on Android Chrome + Safari iOS — these are the real environments
- **Phase:** Phase 1/2 — design for mobile-first player experience from the start

---

### 7. Storing Annotations Inside the Video File

**What happens:** Developer decides to "burn in" coach annotations by re-encoding the video with FFmpeg after annotation. Seems clean but creates a chain of problems: 30-90 second wait per save, can't edit annotations, can't toggle visibility, must re-transcode on every change, storage doubles.

**Warning signs:**
- Long delay after coach clicks "Save annotation"
- No way to hide/show annotations during playback
- Coach can't revise a drawing without starting over

**Prevention:**
- Store annotations as time-indexed JSON in Postgres — never in the video
- Replay them as a canvas overlay during playback
- Only offer "Export with annotations" as an optional background job (v2)
- **Phase:** Phase 2 — architectural decision made before building annotation system

---

### 8. Not Handling Vertical (Portrait) Video

**What happens:** Players record softball video on phones in portrait mode (vertical). Coaches and desktop users see black bars on the sides, or worse, a rotated/stretched video. This is especially bad for pitching video where the full arm circle is cut off.

**Warning signs:**
- Videos look wrong on coach's desktop
- "My video is sideways" bug reports
- AI keypoints are rotated 90° from expected orientation

**Prevention:**
- Use Mux — it handles rotation metadata automatically during transcoding
- Detect video aspect ratio after upload and adjust player container accordingly
- Tell coaches: "Ask players to record in landscape for hitting analysis; portrait OK for pitching"
- AI analysis: check video rotation metadata before running MediaPipe
- **Phase:** Phase 1 (video upload) — handle from day one

---

## Lower Priority Pitfalls (Watch For in V2)

| Pitfall | Risk | Mitigation |
|---------|------|------------|
| Coach reviews from different time zones not aligned | Async workflow confusion | Show timestamps in coach's local time, not UTC |
| Video codec incompatibility (HEVC from iPhone) | Video fails to play in browser | Mux transcoding solves this — transcode everything |
| AI analysis confidence scores misleading coaches | Over-reliance on automated flags | Always frame as "suggestions" — coach confirms |
| Large roster coaches hit storage limits | Cost spiral | Storage quota per plan; alert before limit |
| Feedback package too large to email | Email bounce on delivery notification | Email links to in-app; never attach video to email |
