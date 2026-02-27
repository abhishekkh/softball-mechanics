---
phase: 01-foundation
plan: "04"
subsystem: video-upload
tags: [r2, presigned-url, hls, hls.js, react-dropzone, inngest, tanstack-query, xhr, transcoding]

dependency_graph:
  requires:
    - 01-02 (R2 presigner getPresignedPutUrl, Inngest client, Supabase server/browser clients, transcodeVideo function)
  provides:
    - Presign API route (src/app/api/upload/presign/route.ts) — authenticated POST returning R2 PUT URL
    - Inngest trigger route (src/app/api/inngest-trigger/route.ts) — authenticated POST to send events from client
    - VideoUploader component (src/components/upload/VideoUploader.tsx) — desktop dropzone + mobile camera roll
    - UploadQueue component (src/components/upload/UploadQueue.tsx) — per-file progress bars and status badges
    - TranscodingStatus component (src/components/upload/TranscodingStatus.tsx) — polling badge until video ready
    - HLSPlayer component (src/components/video/HLSPlayer.tsx) — hls.js + Safari native HLS playback
  affects:
    - All pages that display or upload video (need HLSPlayer and VideoUploader)
    - Any feature that needs to fire Inngest events from client code (can reuse inngest-trigger route)

tech-stack:
  added: []
  patterns:
    - XHR used for direct-to-R2 upload (not fetch) — only XMLHttpRequest exposes upload progress events
    - Presign-then-PUT pattern — server generates presigned URL, client uploads directly to R2 (not through Next.js)
    - Inngest event fired from client via thin authenticated API route after R2 upload completes
    - TanStack Query v5 polling pattern — refetchInterval function stops polling when status is ready/error
    - useEffect for side effects on query data change (TanStack Query v5 removed onSuccess from useQuery)
    - Mobile-first file selection — native input without capture attribute lets users pick from camera roll

key-files:
  created:
    - src/app/api/upload/presign/route.ts
    - src/app/api/inngest-trigger/route.ts
    - src/components/upload/VideoUploader.tsx
    - src/components/upload/UploadQueue.tsx
    - src/components/upload/TranscodingStatus.tsx
    - src/components/video/HLSPlayer.tsx
  modified: []

key-decisions:
  - "XHR used instead of fetch for R2 upload — fetch API does not expose upload progress events; XMLHttpRequest xhr.upload.addEventListener('progress') is required for per-file progress bars"
  - "Mobile input has accept='video/*' but NO capture attribute — capture forces live camera recording; omitting it lets athletes select existing videos from camera roll"
  - "TranscodingStatus uses useEffect for onReady callback — TanStack Query v5 removed onSuccess from useQuery; useEffect watching query data is the v5-correct pattern"
  - "Inngest trigger route is a thin authenticated proxy — client code cannot call Inngest SDK directly (requires event key secret); this route validates the user session before forwarding events"
  - "VideoUploader uploadFile extracted as useCallback with full dependency array — avoids stale closure over athleteId/coachId while keeping stable reference for react-dropzone onDrop"

requirements-completed:
  - VID-01
  - VID-02

duration: 4min
completed: 2026-02-27
---

# Phase 1 Plan 4: Video Upload Pipeline Summary

**Direct-to-R2 multi-file upload pipeline with XHR progress tracking, Inngest transcoding trigger, TanStack Query polling status badge, and hls.js HLS player supporting both Chrome/Firefox and Safari native playback.**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-27T05:37:08Z
- **Completed:** 2026-02-27T05:41:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Complete upload pipeline: presign route → XHR PUT to R2 → Inngest trigger → transcoding status polling → HLS playback
- Desktop drag-and-drop (react-dropzone) and mobile camera roll (native input without capture) in one component
- Per-file progress bars during upload, transcoding badge during processing, HLS player when ready

## Upload Flow Walkthrough

1. **Presign** — Client calls `POST /api/upload/presign` with `{filename, contentType, athleteId, coachId}`. Server authenticates user, creates a `videos` row in Supabase with `status: processing`, then generates a 1-hour R2 presigned PUT URL and returns `{presignedUrl, videoId, r2Key}`.

2. **R2 PUT** — Client opens XHR `PUT` to the presigned URL with the file body. XHR `upload.progress` events update the per-file progress bar in `UploadQueue`. `Content-Type` header in XHR must match the exact value sent to the presign route (R2 validates the signature against ContentType).

3. **Inngest trigger** — After XHR `status === 200`, client calls `POST /api/inngest-trigger` with `{name: 'video/uploaded', data: {videoId, key: r2Key}}`. The route validates the user session, then calls `inngest.send()` to enqueue the `transcodeVideo` Inngest function.

4. **Polling** — `TranscodingStatus` component polls `videos` table every 5 seconds via TanStack Query. `refetchInterval` returns `false` once status is `ready` or `error`, stopping the poll. When ready, `useEffect` fires the `onReady(hlsUrl, thumbnailUrl)` callback.

5. **HLS Playback** — `HLSPlayer` checks `Hls.isSupported()` (Chrome, Firefox, Edge). If true, creates `Hls` instance, calls `loadSource(src)` and `attachMedia(video)`. If false and `video.canPlayType('application/vnd.apple.mpegurl')` (Safari), sets `video.src` directly for native HLS.

## Note on XHR vs Fetch

The Fetch API streams request bodies but does not expose upload progress events. `XMLHttpRequest` exposes `xhr.upload.addEventListener('progress', (e) => {...})` which gives `e.loaded` and `e.total` for computing upload percentage. This is why XHR is the industry-standard approach for client-side upload progress bars.

## Confirm: No capture Attribute on Mobile Input

```tsx
<input
  ref={mobileInputRef}
  type="file"
  accept="video/*"
  // NO capture attribute — we want camera roll selection, not forced live recording
  multiple
  onChange={handleMobileFiles}
  className="hidden"
/>
```

The `capture` attribute is intentionally absent. Adding `capture="user"` or `capture="environment"` forces the device to open the camera app for live recording. Without it, iOS and Android show a standard media picker where athletes can select previously recorded videos from their camera roll.

## TypeScript Issues and Resolutions

**TanStack Query v5 `onSuccess` removal:** The plan code used `onSuccess` inside `useQuery()`. TanStack Query v5 (installed: `^5.90.21`) removed the `onSuccess`, `onError`, and `onSettled` callbacks from `useQuery`. These were removed because they had difficult-to-predict execution semantics. The fix (Rule 1 - Bug) was to move the callback into a `useEffect` that watches the query data:

```typescript
// v5 pattern — useEffect instead of onSuccess
useEffect(() => {
  if (data?.status === 'ready' && data.hls_url && data.thumbnail_url) {
    onReady?.(data.hls_url, data.thumbnail_url)
  }
}, [data, onReady])
```

`npx tsc --noEmit` exits 0 with no errors.

## Task Commit Log

| Task | Name | Commit |
|------|------|--------|
| 1 | Presign route and HLS player component | 0fb9426 |
| 2 | VideoUploader, UploadQueue, TranscodingStatus, Inngest trigger | 2e49625 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced deprecated `onSuccess` with `useEffect` in TranscodingStatus**
- **Found during:** Task 2 (TranscodingStatus component)
- **Issue:** Plan code used `onSuccess` callback inside `useQuery()`. TanStack Query v5 (`^5.90.21`) removed this option — using it would cause TypeScript compilation failure
- **Fix:** Moved `onReady` callback call into a `useEffect` watching `data` — the v5-correct pattern for side effects on query data changes
- **Files modified:** src/components/upload/TranscodingStatus.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 2e49625 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix for v5 API compatibility)
**Impact on plan:** Required for TypeScript compilation. Behavior is identical — `onReady` fires when status becomes `ready`. No scope creep.

## Issues Encountered

None beyond the TanStack Query v5 `onSuccess` removal documented above.

## User Setup Required

None — no external service configuration required for this plan. R2, Supabase, and Inngest credentials were established in Plans 01-01 and 01-02.

## Next Phase Readiness

- Video upload pipeline is complete end-to-end
- `VideoUploader` requires `athleteId` and `coachId` props — pages using it need athlete selection UI (Plan 03 auth pages provide the coach's ID via session; athlete selection is a feature for later plans)
- `HLSPlayer` is ready for any page that receives a `hls_url` from the videos table
- `TranscodingStatus` works standalone given a `videoId`

---
*Phase: 01-foundation*
*Completed: 2026-02-27*
