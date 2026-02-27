---
phase: 01-foundation
plan: "02"
subsystem: service-wiring
tags: [supabase, auth, middleware, r2, inngest, transcoding, hls, ffmpeg]
dependency_graph:
  requires:
    - 01-01 (Next.js scaffold, all npm dependencies)
  provides:
    - Supabase browser client (src/lib/supabase/client.ts)
    - Supabase server client (src/lib/supabase/server.ts)
    - Next.js auth middleware with session refresh and role header (src/middleware.ts)
    - R2 S3Client with presigned URL helpers (src/lib/r2.ts)
    - FFmpeg spawn helper (src/lib/ffmpeg.ts)
    - Inngest client instance (src/inngest/client.ts)
    - Inngest serve handler at /api/inngest (src/app/api/inngest/route.ts)
    - 5-step transcodeVideo Inngest function (src/inngest/functions/transcode-video.ts)
  affects:
    - All auth pages (need Supabase clients)
    - Video upload feature (needs R2 presigner)
    - All authenticated routes (gated by middleware)
    - All subsequent Inngest functions (registered in route.ts)
tech_stack:
  added: []
  patterns:
    - Supabase SSR pattern — separate browser and server clients with cookie handling
    - Middleware creates its own Supabase client (does NOT import server.ts — different cookie lifecycle)
    - supabase.auth.getUser() used everywhere (not getSession — JWT verification required)
    - Inngest 5-step durable function pattern with per-step retries
    - Service role Supabase client in Inngest worker (bypasses RLS by design)
key_files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/middleware.ts
    - src/lib/r2.ts
    - src/lib/ffmpeg.ts
    - src/inngest/client.ts
    - src/app/api/inngest/route.ts
    - src/inngest/functions/transcode-video.ts
  modified:
    - .env.local.example (added SUPABASE_SERVICE_ROLE_KEY)
decisions:
  - "Middleware creates its own Supabase client directly from @supabase/ssr — not from src/lib/supabase/server.ts — because middleware runs in Edge runtime where the cookies() helper from next/headers is unavailable"
  - "supabase.auth.getUser() used in middleware (not getSession) — getSession reads from cookie without JWT verification, making it insecure"
  - "transcodeVideo uses service role key in Step 5 DB update to bypass RLS — intentional, matches 01-01 schema design"
  - "5 step.run() checkpoints in transcodeVideo ensure retry-safe execution — failure at Step 3 retries from Step 3 only"
metrics:
  duration: "2 minutes"
  completed_date: "2026-02-27"
  tasks_completed: 2
  files_created: 8
  files_modified: 1
---

# Phase 1 Plan 2: Service Wiring (Supabase, R2, Inngest) Summary

**One-liner:** Supabase SSR browser/server clients + auth middleware with role header, Cloudflare R2 presigner, and a 5-step retry-safe Inngest transcodeVideo function covering download, FFmpeg HLS encode, R2 upload, thumbnail extraction, and DB status update.

## What Was Built

### Task 1: Supabase Clients and Next.js Auth Middleware

**src/lib/supabase/client.ts** — Browser client for Client Components using `createBrowserClient` from `@supabase/ssr`. Used in client-side auth flows and data fetching in Client Components.

**src/lib/supabase/server.ts** — Async server client for Server Components, Route Handlers, and Server Actions. Uses `await cookies()` from `next/headers` and implements full `getAll`/`setAll` cookie interface for session refresh.

**src/middleware.ts** — Runs on every request (matcher excludes static assets and images):
- Creates a fresh Supabase client using `createServerClient` from `@supabase/ssr` directly (NOT importing `server.ts`) — avoids `cookies()` being called in Edge runtime
- Calls `supabase.auth.getUser()` to verify JWT and get authenticated user
- Allows public paths: `/login`, `/signup`, `/auth/callback`, `/invite`
- Redirects unauthenticated requests on all other routes to `/login`
- Attaches `x-user-role` response header (value: `user_metadata.role ?? 'coach'`) so Server Components can read the role without an extra DB call

### Task 2: R2 Client, Inngest Client, and transcodeVideo Function

**src/lib/r2.ts** — S3Client pointed at `https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com` with `region: auto`:
- `getPresignedPutUrl(key, contentType)` — 1-hour PUT presigned URL; ContentType is explicitly included (R2 validates signature against ContentType)
- `getPresignedGetUrl(key)` — 1-hour GET presigned URL
- `getPublicUrl(key)` — Returns `${R2_PUBLIC_URL}/${key}` for publicly-accessible HLS segments and thumbnails

**src/lib/ffmpeg.ts** — `runFfmpeg(args)` wraps `child_process.spawn` around `ffmpeg-static` binary:
- Guards against null `ffmpegPath` (relevant for deployment environments where static binary may not be available)
- Collects stderr, surfaces last 500 chars in error message on non-zero exit
- Returns a Promise<void>

**src/inngest/client.ts** — Inngest client instance with app id `softball-mechanics`.

**src/app/api/inngest/route.ts** — `serve()` handler exporting `GET, POST, PUT` (all three required by Inngest). Functions array contains `transcodeVideo`. All future Inngest functions must be added here.

**src/inngest/functions/transcode-video.ts** — 5-step durable function triggered by `video/uploaded` event:

| Step | Name | What it does |
|------|------|-------------|
| 1 | `download-raw-video` | Downloads raw video from R2 via GetObjectCommand, writes to `/tmp/{videoId}.{ext}` |
| 2 | `transcode-to-hls` | Runs FFmpeg: libx264 720p at 2800kbps, AAC 128kbps, 6-second HLS segments, outputs to `/tmp/{videoId}-hls/` |
| 3 | `upload-hls-to-r2` | Reads all files from HLS output dir, uploads each to R2 with correct content-type (`.m3u8` → `application/vnd.apple.mpegurl`, `.ts` → `video/mp2t`) |
| 4 | `extract-thumbnail` | Extracts frame at 2s with `-q:v 2`, uploads JPEG to R2 at `videos/{videoId}/thumbnail.jpg` |
| 5 | `update-status` | Uses service role Supabase client to update `videos` row: `status=ready`, `hls_url`, `thumbnail_url`, `transcoded_at` |

Each step is independently retried — if Step 3 fails, Inngest retries from Step 3, not from Step 1.

## Environment Variables

All required env vars were already in `.env.local.example` from Plan 01. One addition made in this plan:

| Variable | Source | Added in |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | 01-01 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → API → Publishable key | 01-01 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API → service_role key | **01-02** |
| `CF_ACCOUNT_ID` | Cloudflare Dashboard → Account ID | 01-01 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 → Manage API tokens | 01-01 |
| `R2_SECRET_ACCESS_KEY` | Same R2 API token creation page | 01-01 |
| `R2_BUCKET_NAME` | Name of your R2 bucket | 01-01 |
| `R2_PUBLIC_URL` | Cloudflare R2 → bucket → Settings → Public access URL | 01-01 |
| `INNGEST_EVENT_KEY` | Inngest Dashboard → Event keys | 01-01 |
| `INNGEST_SIGNING_KEY` | Inngest Dashboard → Signing keys | 01-01 |

## ffmpegPath Validation Note

`ffmpeg-static` exports the path to its bundled binary. In this local dev environment the path will be non-null (package includes macOS ARM binary). The null guard in `runFfmpeg` defends against deployment environments (e.g., Vercel Lambdas without bundled binary). Inngest workers run in a separate execution environment — validate that `ffmpegPath` is non-null when first testing the transcoding job end-to-end (see RESEARCH.md Open Question #1 and Pitfall 4).

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` exits 0 | PASSED |
| `middleware.ts` uses `getUser()` (no `getSession`) | PASSED |
| 5 `step.run()` calls in transcodeVideo | PASSED (download-raw-video, transcode-to-hls, upload-hls-to-r2, extract-thumbnail, update-status) |
| R2 presigned PUT includes explicit ContentType | PASSED |
| `/api/inngest` exports GET, POST, PUT | PASSED |
| `transcodeVideo` in Inngest functions array | PASSED |
| `SUPABASE_SERVICE_ROLE_KEY` in `.env.local.example` | PASSED |

## Deviations from Plan

None — plan executed exactly as written.

## Task Commit Log

| Task | Name | Commit |
|------|------|--------|
| 1 | Add Supabase clients and Next.js auth middleware | be6643f |
| 2 | Add R2 client, Inngest client, and transcodeVideo function | ea0ba73 |

## Self-Check: PASSED
