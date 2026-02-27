# Phase 1: Foundation - Research

**Researched:** 2026-02-26
**Domain:** Authentication, video upload + HLS transcoding pipeline, athlete roster management
**Confidence:** HIGH (stack decisions verified against official docs and Context7)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Video upload initiation**
- Native camera capture on mobile (open device camera directly)
- File picker button on desktop
- Both coach and athlete can upload videos — athletes upload their own footage, coaches can also upload on behalf of athletes

**Upload session behavior**
- Multiple files can be uploaded in one session (queue several at once)
- Coach assigns the video to a specific athlete during the upload flow (not after)
- Progress indicator stays on the same page during the ~2 minute transcoding wait — no redirect

**Coach dashboard (session queue)**
- List view sorted by most recent upload
- Each session row shows: video thumbnail, athlete name + avatar, upload date/time, status badge
- Status badge states: Processing / Ready for Review / Reviewed / Delivered

**Athlete view**
- Athlete sees their own submission list on login — videos they uploaded and videos the coach uploaded for them
- Athlete and coach have distinct role-scoped views with different content

### Claude's Discretion
- Athlete invite & access flow — implementation approach, email vs SMS, one-time vs persistent link, first-time vs returning athlete experience
- Roster management UX — how coach lists, invites, and manages athletes
- Loading skeleton design, error state messaging, exact spacing and typography
- Empty state content for new coaches with no sessions yet

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Coach can create an account with email and password | Supabase `signUp()` with email/password; `@supabase/ssr` middleware handles session cookies in Next.js App Router |
| AUTH-02 | Coach can log in and stay logged in across browser sessions | Supabase cookie-based sessions via `@supabase/ssr`; middleware refreshes tokens on every request |
| AUTH-03 | Coach can invite an athlete via a shareable link (no full account required for athlete) | Supabase Admin `inviteUserByEmail()` + custom token flow OR magic link via `generateLink()` type "invite"; magic link for passwordless athlete access |
| AUTH-04 | Athlete can access their submissions and feedback via invite link / magic link | Supabase magic link / OTP token flow; athlete JWT carries `role: athlete` via custom access token hook |
| VID-01 | Coach or athlete can upload a video from their camera roll (phone or desktop) | react-dropzone for desktop file picker; `<input type="file" accept="video/*">` for mobile camera access; presigned PUT URL to Cloudflare R2 avoids routing video through server |
| VID-02 | Uploaded video is transcoded to HLS for smooth streaming playback | Inngest background function downloads raw video from R2, runs ffmpeg-static via child_process to produce `.m3u8` + `.ts` segments, uploads HLS tree back to R2; HLS.js plays back in browser |
| ROST-01 | Coach can view their athlete roster | Postgres `athletes` + `coach_athletes` join table; RLS policy restricts coach to their own athletes; server component fetches from Supabase |
| ROST-02 | Coach can invite an athlete to their roster via a shareable link | Supabase Admin `inviteUserByEmail()` creates an invite token; Next.js route handler mints the invite link; athlete hits `/invite/[token]` to accept |
</phase_requirements>

---

## Summary

Phase 1 is a full-stack foundation: three distinct technical domains (auth, video pipeline, roster) that must be wired together correctly before any later phase can build on them. The most critical architectural decision — already made in STATE.md — is that **Inngest must be wired before the video pipeline**, because FFmpeg transcoding runs for 1–3 minutes and will time out on Vercel's serverless functions (10s–60s limit). Inngest solves this by running the transcoding function as a durable background step outside the request cycle.

The auth stack is Supabase with `@supabase/ssr` for cookie-based sessions in the Next.js App Router. The athlete invite flow works cleanly through Supabase's `inviteUserByEmail()` (admin API) which sends a magic link; athletes never need to create a password. Role separation (coach vs athlete) is implemented via a custom claim in the Supabase JWT, enforced at the middleware layer and backed by Row Level Security (RLS) policies on every table.

Video upload uses presigned PUT URLs to Cloudflare R2, bypassing the Next.js server entirely for the large binary. After upload, the client fires an Inngest event; the Inngest function downloads the raw file from R2, invokes `ffmpeg-static` (bundled binary, no system dependency) to produce multi-bitrate HLS segments, and uploads the `.m3u8` + `.ts` files back to R2. The browser plays HLS via `hls.js`. A thumbnail is extracted during transcoding (single FFmpeg frame grab) and stored alongside the HLS tree for the coach dashboard row.

**Primary recommendation:** Wire Inngest + Supabase + R2 as the foundational three-service triangle first. Everything else in this phase is CRUD on top of that triangle.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 15.x | App Router, server actions, middleware | Project baseline; App Router is the current Next.js paradigm |
| `@supabase/supabase-js` | 2.x | Supabase client (auth, DB queries) | Official JS client; required for all Supabase interaction |
| `@supabase/ssr` | latest | Cookie-based auth for SSR/App Router | Official Next.js adapter; handles token refresh in middleware |
| `inngest` | latest | Durable background jobs (video transcoding) | Already decided in STATE.md; handles serverless timeout problem |
| `@aws-sdk/client-s3` | 3.x | S3-compatible R2 presigned URL generation | R2 is S3-compatible; AWS SDK v3 is the standard approach |
| `@aws-sdk/s3-request-presigner` | 3.x | Generate presigned PUT/GET URLs | Companion to client-s3 for URL signing |
| `ffmpeg-static` | latest (6.1.1) | Bundled FFmpeg binary for Node.js | Self-contained binary, ~218k weekly downloads; no system dep |
| `hls.js` | 1.x | HLS video playback in non-Safari browsers | Standard; Safari has native HLS, hls.js handles Chrome/Firefox |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-dropzone` | 14.x | File drag-and-drop + picker UI | Desktop upload area; wraps native `<input>` with DnD support |
| `@tanstack/react-query` | 5.x | Server state, polling transcoding status | Poll `video.status` while "Processing" badge is shown |
| `zod` | 3.x | Schema validation for server actions | Validate upload metadata, invite forms |
| `tailwindcss` | 4.x | Utility-first styling | Standard for this type of project |
| `shadcn/ui` | latest | Accessible component primitives | Badges, modals, forms built on Radix UI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inngest | BullMQ + Redis | BullMQ needs a persistent Redis instance; adds infra; Inngest is zero-infra and integrates with Vercel natively |
| Inngest | AWS Lambda + SQS | More complex infra, IAM setup; Inngest has simpler DX for this scale |
| Cloudflare R2 | AWS S3 | S3 has egress fees; R2 has zero egress — already decided in STATE.md, not revisited |
| `ffmpeg-static` | `fluent-ffmpeg` | fluent-ffmpeg was **archived May 2025** and no longer maintained; use `ffmpeg-static` + `child_process.spawn` directly |
| `hls.js` | `video.js` | Video.js is heavier (~300KB+); hls.js is focused, smaller; sufficient for VOD playback |
| `react-dropzone` | `uppy` + `tus` | TUS is excellent for resumable uploads; for v1 video files are typically <500MB and single-attempt is acceptable |
| Supabase inviteUserByEmail | Custom JWT invite system | Custom systems require more code and edge cases; Supabase admin API handles the invite email, token, and user creation |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr inngest \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  ffmpeg-static react-dropzone hls.js \
  @tanstack/react-query zod \
  tailwindcss shadcn/ui
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Route group: auth pages share no layout with app
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (app)/                   # Route group: authenticated app with shared layout
│   │   ├── layout.tsx           # Checks auth, injects role
│   │   ├── dashboard/page.tsx   # Coach session queue
│   │   └── submissions/page.tsx # Athlete view
│   ├── api/
│   │   ├── inngest/route.ts     # Inngest serve handler (GET, POST, PUT)
│   │   └── upload/presign/route.ts  # Returns presigned PUT URL
│   └── layout.tsx               # Root layout
├── inngest/
│   ├── client.ts                # Inngest client instance
│   └── functions/
│       └── transcode-video.ts   # Video transcoding function
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server Supabase client (cookies)
│   │   └── middleware.ts        # createServerClient for middleware.ts
│   ├── r2.ts                    # S3 client configured for R2
│   └── ffmpeg.ts                # FFmpeg spawn helper
├── components/
│   ├── upload/
│   │   ├── VideoUploader.tsx    # react-dropzone + mobile input
│   │   ├── UploadQueue.tsx      # Multi-file queue with progress
│   │   └── TranscodingStatus.tsx # Polls and shows status badge
│   ├── roster/
│   │   ├── RosterList.tsx
│   │   └── InviteAthleteModal.tsx
│   └── video/
│       └── HLSPlayer.tsx        # hls.js wrapper component
├── middleware.ts                 # Auth + role redirect middleware
└── supabase/
    └── migrations/              # SQL migration files
```

### Pattern 1: Supabase SSR Auth in Next.js App Router

**What:** Two Supabase client types — browser client for Client Components, server client for Server Components/Actions/Route Handlers. Middleware handles token refresh on every request.

**When to use:** Every authenticated page and API route.

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

```typescript
// src/middleware.ts — refreshes session on every request
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // CRITICAL: use getClaims() not getSession() — verifies JWT signature
  const { data: { user } } = await supabase.auth.getUser()

  // Role-based redirect
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Pattern 2: Athlete Invite via Supabase Admin

**What:** Server Action (or Route Handler) calls `supabase.auth.admin.inviteUserByEmail()`. Supabase sends the email with a magic link. When clicked, the route handler calls `verifyOtp()` to exchange the token for a session. Role is assigned via `user_metadata` or a `profiles` table lookup.

**When to use:** Coach invites an athlete from the roster management UI.

**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail

// Server Action: invite athlete
'use server'
import { createClient } from '@/lib/supabase/server'

export async function inviteAthlete(email: string, coachId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role: 'athlete', invited_by: coachId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  if (error) throw error

  // Also create a pending record in coach_athletes
  await supabase.from('coach_athletes').insert({
    coach_id: coachId,
    athlete_email: email,
    status: 'pending',
  })

  return data
}
```

**Note:** `inviteUserByEmail` does NOT support PKCE. Use the invite flow directly (not OAuth flow). The athlete receives an email; clicking it completes signup and creates their Supabase user with `role: athlete` in `user_metadata`.

### Pattern 3: Presigned PUT Upload to R2

**What:** Next.js server action generates a time-limited presigned PUT URL. Client uploads the file directly to R2 (never through Next.js server). After upload completes, client fires an Inngest event to start transcoding.

**When to use:** Every video upload.

**Example:**
```typescript
// Source: https://developers.cloudflare.com/r2/api/s3/presigned-urls/

// src/app/api/upload/presign/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  const { filename, contentType, videoId } = await req.json()
  const key = `raw/${videoId}/${filename}`

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,  // MUST be specified — R2 signature fails on mismatch
    }),
    { expiresIn: 3600 }
  )

  return Response.json({ url, key })
}
```

```typescript
// Client: upload file then trigger transcoding
async function uploadVideo(file: File, videoId: string) {
  // 1. Get presigned URL
  const { url, key } = await fetch('/api/upload/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type, videoId }),
  }).then(r => r.json())

  // 2. PUT directly to R2
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  // 3. Fire Inngest event to start transcoding
  await fetch('/api/inngest-trigger', {
    method: 'POST',
    body: JSON.stringify({ name: 'video/uploaded', data: { videoId, key } }),
  })
}
```

### Pattern 4: Inngest Video Transcoding Function

**What:** Inngest function receives `video/uploaded` event, downloads raw video from R2 to `/tmp`, runs FFmpeg via `child_process.spawn` to produce HLS segments, uploads segments back to R2, updates video status in Postgres. Each step is checkpointed — if the function fails midway, Inngest retries from the last successful step.

**When to use:** Every video upload triggers this.

**Example:**
```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start

// src/inngest/functions/transcode-video.ts
import { inngest } from '../client'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { createReadStream, writeFileSync } from 'fs'
import { createClient } from '@/lib/supabase/server'

export const transcodeVideo = inngest.createFunction(
  { id: 'transcode-video', retries: 3 },
  { event: 'video/uploaded' },
  async ({ event, step }) => {
    const { videoId, key } = event.data

    // Step 1: Download raw video from R2 to /tmp
    const localPath = await step.run('download-raw-video', async () => {
      // GetObject from R2, write to /tmp/videoId.mp4
      return `/tmp/${videoId}.mp4`
    })

    // Step 2: Run FFmpeg → HLS
    await step.run('transcode-to-hls', async () => {
      await runFfmpegHls(localPath, `/tmp/${videoId}-hls`)
    })

    // Step 3: Upload HLS tree to R2
    await step.run('upload-hls-to-r2', async () => {
      // Upload all .m3u8 and .ts files from /tmp/videoId-hls/ to R2
      // under videos/{videoId}/hls/
    })

    // Step 4: Extract thumbnail (single frame)
    await step.run('extract-thumbnail', async () => {
      // FFmpeg: -vframes 1 -ss 00:00:02 → thumbnail.jpg
      // Upload to R2: videos/{videoId}/thumbnail.jpg
    })

    // Step 5: Update DB status
    await step.run('update-status', async () => {
      const supabase = await createClient()
      await supabase.from('videos')
        .update({ status: 'ready', hls_url: `${process.env.R2_PUBLIC_URL}/videos/${videoId}/hls/master.m3u8` })
        .eq('id', videoId)
    })

    return { videoId, status: 'ready' }
  }
)
```

**FFmpeg HLS command (from official FFmpeg documentation + verified source):**
```bash
# Source: https://yehiaabdelm.com/blog/roll-your-own-hls
ffmpeg -i input.mp4 \
  -vf scale=1280:720 -c:v libx264 -b:v 2800k \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -hls_time 6 -hls_segment_filename "segment_%03d.ts" \
  -f hls playlist.m3u8
```

### Pattern 5: Role-Based RLS in Supabase

**What:** Every table has RLS enabled. Policies read the user's role from their JWT `app_metadata`. Coach sees all their athletes' videos; athletes see only their own.

**When to use:** Every table that stores user-specific data.

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Coach can see videos for their athletes
CREATE POLICY "coach_reads_athlete_videos" ON videos
  FOR SELECT
  USING (
    athlete_id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid()
    )
  );

-- Athlete can only see their own videos
CREATE POLICY "athlete_reads_own_videos" ON videos
  FOR SELECT
  USING (athlete_id = auth.uid());
```

### Pattern 6: Mobile Video Upload (Native Camera)

**What:** On mobile, use `<input type="file" accept="video/*">` WITHOUT the `capture` attribute. The `capture` attribute forces the camera open and prevents selecting existing files from the camera roll — which is the WRONG behavior for this app (athletes upload previously recorded footage).

**When to use:** Mobile upload button.

**Important caveat:** The `capture="environment"` attribute locks users into recording new video only; they cannot select existing files. Since athletes are uploading their own previously-recorded swing footage (not recording live), do NOT use `capture`.

```tsx
// Correct mobile input — allows camera roll selection
<input
  type="file"
  accept="video/*"
  onChange={handleFileSelect}
  className="hidden"
  ref={mobileInputRef}
/>
```

```tsx
// react-dropzone for desktop with drag-and-drop
const { getRootProps, getInputProps } = useDropzone({
  accept: { 'video/*': [] },
  maxFiles: 10,   // multi-file queue
  onDrop: handleFiles,
})
```

### Anti-Patterns to Avoid

- **Transcoding in a Next.js Route Handler:** Will hit Vercel's 60s (Pro) or 10s (Hobby) execution limit. Always offload to Inngest.
- **Uploading video through Next.js API route:** Videos can be hundreds of MB; routing through the server wastes bandwidth and can hit body size limits (Vercel: 4.5MB default). Use presigned R2 PUT.
- **`getSession()` for auth checks:** Returns the session from the cookie without verifying the JWT signature. Use `getUser()` / `getClaims()` which hit the Supabase Auth server.
- **`capture="environment"` on mobile input:** Forces live recording, blocks camera roll access. Athletes upload pre-recorded clips.
- **`fluent-ffmpeg`:** Archived in May 2025, no longer maintained. Use `ffmpeg-static` + `child_process.spawn` directly.
- **Single RLS policy with `FOR ALL`:** Supabase recommends 4 separate policies (SELECT, INSERT, UPDATE, DELETE) for clarity and performance.
- **`ContentType: "*"` in R2 presigned URL:** R2 does NOT support wildcard headers the way AWS does. Always specify the exact Content-Type in the presigned URL command.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookies in Next.js App Router | Custom cookie management | `@supabase/ssr` | Handles token refresh, server component/action split, SSR edge cases |
| Video transcoding job queue | Custom job table + cron | Inngest | Handles retries, step checkpointing, serverless timeout, observability |
| FFmpeg binary management | System `apt install ffmpeg` + path resolution | `ffmpeg-static` npm package | Self-contained binary in node_modules; works in Vercel and Docker |
| Presigned URL generation | Custom HMAC signing | AWS SDK v3 `getSignedUrl()` | Handles S3 signature algorithm V4 correctly |
| Video player HLS parsing | Custom `.m3u8` + `<video>` | `hls.js` | Handles segment loading, bandwidth detection, Safari MSE differences |
| User invite/magic-link system | Custom token generation + email | Supabase `inviteUserByEmail()` | Handles token expiry, email delivery, one-time use, user creation atomically |
| Role-based access enforcement | Custom middleware role checks | Supabase RLS + JWT claims | RLS is enforced at DB layer — can't be bypassed even if middleware is misconfigured |

**Key insight:** The video pipeline (upload → transcode → serve) has significant edge cases at every step. Presigned URLs, FFmpeg arguments, HLS segment timing, content-type headers, and CORS configuration all have non-obvious failure modes. Use verified patterns rather than iterating on custom implementations.

---

## Common Pitfalls

### Pitfall 1: Inngest Not Registered / Functions Not Discovered

**What goes wrong:** Inngest functions are defined but the serve handler at `app/api/inngest/route.ts` doesn't include them. Events fire but no function runs. No error is thrown — the event just silently disappears.
**Why it happens:** Forgetting to add the function to the `functions: [...]` array in the `serve()` call.
**How to avoid:** Every new Inngest function must be explicitly added to the serve handler array.
**Warning signs:** Inngest dashboard shows events received but no function runs in the "Runs" tab.

### Pitfall 2: R2 CORS Blocking Browser Uploads

**What goes wrong:** Presigned PUT URL is valid, but the browser's PUT request fails with a CORS error.
**Why it happens:** R2 buckets have no CORS policy by default. Browser pre-flight `OPTIONS` request is rejected.
**How to avoid:** Add a CORS policy to the R2 bucket before any upload code is written. Set `AllowedHeaders: ["content-type"]` (NOT `["*"]` — R2 does not support wildcard AllowedHeaders).
**Warning signs:** Browser console shows `Access-Control-Allow-Origin` error on the PUT request.

### Pitfall 3: Supabase `getSession()` Instead of `getUser()` in Middleware

**What goes wrong:** Route protection appears to work but is actually insecure — `getSession()` reads the session from the cookie without verifying the JWT signature.
**Why it happens:** Common copy-paste from older Supabase tutorials.
**How to avoid:** Always use `supabase.auth.getUser()` (or `getClaims()` with the newer `@supabase/ssr`) in middleware and server components that gate access.
**Warning signs:** Supabase documentation (2025) explicitly warns: "Always use `supabase.auth.getUser()` to protect pages and user data."

### Pitfall 4: FFmpeg Binary Not Found in Production

**What goes wrong:** `ffmpeg-static` returns the correct binary path locally but the path is undefined in Vercel's Lambda environment.
**Why it happens:** Vercel serverless functions cannot execute arbitrary binaries from `node_modules`. The binary needs to be invoked via a different deployment target (e.g., Inngest running on a long-running worker, or a separate container).
**How to avoid:** Inngest functions run on Inngest's infrastructure (not Vercel's edge/lambda). For Vercel deployment, Inngest workers use their own runtime that supports `ffmpeg-static`. Verify with a simple `ffmpegPath` log step before building the full pipeline.
**Warning signs:** `spawn /tmp/ffmpeg ENOENT` error in Inngest function logs.

### Pitfall 5: Custom Access Token Hook Doesn't Update Live Sessions

**What goes wrong:** Coach assigns role `athlete` to a user, but the user's active session still has the old role in the JWT until they log out and back in.
**Why it happens:** Supabase JWTs are signed at login time. The custom access token hook runs at token issue time, not on each request.
**How to avoid:** After role assignment, call `supabase.auth.admin.updateUserById()` to force token refresh, or implement a UI prompt to ask the user to refresh. For invite flow (new users), this isn't an issue since the JWT is minted fresh on first login.

### Pitfall 6: Missing Content-Type Match in R2 Presigned URLs

**What goes wrong:** Upload returns `403 SignatureDoesNotMatch`.
**Why it happens:** The `ContentType` specified in the `PutObjectCommand` when generating the presigned URL must exactly match the `Content-Type` header the browser sends when doing the PUT. If the browser sends `video/mp4` but the presigned URL was generated for `video/quicktime`, the signature validation fails.
**How to avoid:** Pass the file's actual MIME type from the client when requesting the presigned URL. Use `file.type` from the File API.

### Pitfall 7: `capture="environment"` Blocks Camera Roll Access

**What goes wrong:** Athletes on mobile cannot select previously-recorded videos from their camera roll.
**Why it happens:** The HTML `capture` attribute signals the browser to open the camera directly and bypass file selection. This is the opposite of what athletes need.
**How to avoid:** Use `accept="video/*"` without `capture`. On mobile, this presents a file picker that includes the camera roll AND the option to record new video.

---

## Code Examples

Verified patterns from official sources:

### Supabase Middleware Setup (Next.js App Router)
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/invite')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Inngest Route Handler Setup
```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '../../../inngest/client'
import { transcodeVideo } from '../../../inngest/functions/transcode-video'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcodeVideo],  // Add all functions here
})
```

### Inngest Client
```typescript
// src/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'softball-mechanics' })
```

### R2 Presigned GET URL for HLS Playback
```typescript
// Source: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// For serving private HLS segments, presign the master.m3u8
// For public playback, configure the R2 bucket with public access
// and serve directly via the public R2 URL
const playbackUrl = `${process.env.R2_PUBLIC_URL}/videos/${videoId}/hls/master.m3u8`
```

### HLS Player Component
```typescript
// Source: https://blog.logrocket.com/next-js-real-time-video-streaming-hls-js-alternatives/
'use client'
import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export function HLSPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari: native HLS support
      video.src = src
    }
  }, [src])

  return <video ref={videoRef} controls playsInline />
}
```

### Coach Email/Password Signup
```typescript
// Source: https://supabase.com/docs/guides/auth/quickstarts/nextjs
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { role: 'coach' },  // Stored in user_metadata
    },
  })

  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 (deprecated 2024) | Use `@supabase/ssr` — auth-helpers is legacy |
| `getSession()` for protection | `getUser()` / `getClaims()` | 2024 | `getSession()` is insecure — doesn't verify JWT |
| `fluent-ffmpeg` npm package | `ffmpeg-static` + `child_process` | May 2025 (fluent-ffmpeg archived) | fluent-ffmpeg is no longer maintained |
| `@supabase/auth-helpers-nextjs` cookie pattern | `@supabase/ssr` `createServerClient()` | 2024 | New publishable key format (`sb_publishable_xxx`) replaces anon key |
| `capture="environment"` for mobile video | `accept="video/*"` without capture | Ongoing | `capture` blocks camera roll; use `accept` only |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated, replaced by `@supabase/ssr`. Do not use.
- `fluent-ffmpeg`: Archived May 2025. GitHub repo is read-only. Do not use.
- `supabase.auth.getSession()` for page protection: Security risk. Use `getUser()` instead.
- `capture="environment"` on file input for camera roll uploads: Blocks existing file selection on Android 14+.

---

## Proposed Database Schema

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roster: many-to-many coach ↔ athlete
CREATE TABLE coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  athlete_id UUID REFERENCES profiles(id),  -- NULL until athlete accepts invite
  athlete_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT,
  raw_r2_key TEXT NOT NULL,          -- R2 path to original upload
  hls_url TEXT,                       -- Public URL to master.m3u8
  thumbnail_url TEXT,                 -- R2 public URL for poster frame
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'reviewed', 'delivered', 'error')),
  duration_seconds INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  transcoded_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
```

---

## R2 Bucket Structure

```
{bucket}/
├── raw/
│   └── {videoId}/
│       └── original.{ext}          # Uploaded by client via presigned PUT
└── videos/
    └── {videoId}/
        ├── hls/
        │   ├── master.m3u8          # Master playlist
        │   ├── 720p/
        │   │   ├── playlist.m3u8
        │   │   ├── segment_000.ts
        │   │   └── segment_NNN.ts
        │   └── 480p/
        │       ├── playlist.m3u8
        │       └── segment_NNN.ts
        └── thumbnail.jpg            # First-frame poster image
```

---

## Open Questions

1. **Where do Inngest functions run when deployed to Vercel?**
   - What we know: Inngest functions are served via a Next.js Route Handler; Inngest's cloud calls back into that endpoint.
   - What's unclear: Whether `ffmpeg-static` binary execution works within Vercel's Lambda runtime. Vercel Lambdas can execute binaries if they're under 250MB, but binaries must be invokable — this needs a smoke-test early.
   - Recommendation: In Wave 0 (setup), add a test Inngest function that logs `ffmpegPath` and verifies it's non-null before building the full pipeline. If it fails on Vercel, the fallback is deploying the Inngest worker as a separate Node.js service on Railway or Fly.io.

2. **Public vs. private R2 bucket for HLS segments**
   - What we know: Public bucket = simpler (direct URL works); Private bucket = presigned GET URL required per segment, which `hls.js` doesn't natively support for segment URLs embedded in `.m3u8`.
   - What's unclear: Whether to make HLS segments public or build a segment-auth proxy.
   - Recommendation: For Phase 1, use a **public R2 bucket** for HLS output. Video files are uploaded by authenticated users but not sensitive. Private auth proxy (Cloudflare Worker) can be added in a later phase if needed.

3. **Athlete invite: email-only or also SMS / shareable URL?**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: Use **email-only via Supabase `inviteUserByEmail()`** for Phase 1. It's zero-custom-code for the token/magic-link mechanics. SMS and QR-code links are v2.

4. **Multi-bitrate vs. single-bitrate HLS**
   - What we know: Multi-bitrate (720p + 480p) gives better adaptive streaming. Single-bitrate (720p only) is simpler to implement.
   - Recommendation: Start with **single 720p HLS** for Phase 1. The `<2 minute transcoding` success criterion is easier to hit with one quality level. Multi-bitrate can be added in a later phase with a simple loop change.

---

## Sources

### Primary (HIGH confidence)
- `https://supabase.com/docs/guides/auth/server-side/nextjs` — Supabase SSR setup, middleware pattern, `getUser()` vs `getSession()`
- `https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail` — Athlete invite API
- `https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac` — RLS + role JWT claims
- `https://developers.cloudflare.com/r2/api/s3/presigned-urls/` — Presigned PUT URL for R2
- `https://developers.cloudflare.com/r2/buckets/cors/` — CORS configuration for browser uploads
- `https://www.inngest.com/docs/getting-started/nextjs-quick-start` — Inngest Next.js setup, serve handler, createFunction
- `https://nextjs.org/docs/app/getting-started/project-structure` — Next.js 15 App Router file/folder conventions (fetched 2026-02-24)

### Secondary (MEDIUM confidence)
- `https://yehiaabdelm.com/blog/roll-your-own-hls` — Complete HLS transcoding pipeline with R2; FFmpeg command verified against FFmpeg docs
- `https://github.com/fluent-ffmpeg/node-fluent-ffmpeg` — Confirmed archived May 2025; cross-verified by multiple WebSearch results
- `https://www.npmjs.com/package/ffmpeg-static` — ffmpeg-static package; version 6.1.1; 218k weekly downloads; actively maintained
- `https://blog.logrocket.com/next-js-real-time-video-streaming-hls-js-alternatives/` — HLS.js + Next.js integration pattern

### Tertiary (LOW confidence — flag for validation)
- Inngest + ffmpeg-static compatibility on Vercel Lambda runtime: No direct source confirming binary execution works. Needs smoke-test validation in Wave 0.
- `hls.js` bundle size ~300KB gzip: Reported in search results but not verified against current npm package size.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified via official docs and npm (except Inngest+ffmpeg-static on Vercel which is MEDIUM/needs validation)
- Architecture: HIGH — patterns derived from official Supabase, Inngest, Cloudflare R2 docs
- Pitfalls: HIGH — most confirmed from official documentation warnings; fluent-ffmpeg deprecation confirmed from GitHub

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stack is relatively stable; re-check Supabase SSR and Inngest changelogs before planning resumes after 30 days)
