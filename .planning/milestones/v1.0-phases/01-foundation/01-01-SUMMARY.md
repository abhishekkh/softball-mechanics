---
phase: 01-foundation
plan: "01"
subsystem: project-scaffold
tags: [nextjs, supabase, dependencies, schema, rls, inngest, r2]
dependency_graph:
  requires: []
  provides:
    - Next.js 15 App Router project scaffold
    - All Phase 1 npm dependencies installed
    - Supabase DB schema with RLS (profiles, coach_athletes, videos)
    - .env.local.example documenting all required environment variables
  affects:
    - All subsequent plans in Phase 1 and beyond
tech_stack:
  added:
    - next@16.1.6
    - react@19.2.3
    - typescript@5.9.3
    - tailwindcss@4.2.1
    - "@supabase/supabase-js@2.98.0"
    - "@supabase/ssr@0.8.0"
    - inngest@3.52.4
    - "@aws-sdk/client-s3@3.999.0"
    - "@aws-sdk/s3-request-presigner@3.999.0"
    - ffmpeg-static@5.3.0
    - react-dropzone@15.0.0
    - hls.js@1.6.15
    - "@tanstack/react-query@5.90.21"
    - zod@4.3.6
    - shadcn/ui (New York style, CSS variables, radix-ui@1.4.3)
  patterns:
    - Next.js App Router with src/ directory layout
    - shadcn/ui component library initialized with New York style
    - Supabase RLS with separate policies per operation (SELECT/INSERT/UPDATE)
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - components.json
    - .env.local.example
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/lib/utils.ts
    - supabase/migrations/001_initial_schema.sql
  modified:
    - .gitignore (added !.env.local.example exception)
decisions:
  - "Used temp directory to scaffold create-next-app due to .planning/ conflict; then rsync-copied files back"
  - "Added !.env.local.example exception to .gitignore so the example file is committed but .env.local remains ignored"
  - "next.config.ts uses *.r2.dev wildcard for image remotePatterns to cover any Cloudflare R2 subdomain"
  - "10 RLS policies total: 4 on profiles, 3 on coach_athletes, 3 on videos"
  - "Inngest transcoding updates use Supabase service role key (bypasses RLS by design — no policy added for service role)"
metrics:
  duration: "4 minutes"
  completed_date: "2026-02-27"
  tasks_completed: 2
  files_created: 19
---

# Phase 1 Plan 1: Project Scaffold and Database Schema Summary

**One-liner:** Next.js 15 App Router scaffold with Tailwind + shadcn/ui, 10 Phase 1 npm packages, and Supabase Postgres schema with RLS (profiles/coach_athletes/videos) plus auto-create-profile trigger.

## What Was Built

### Task 1: Next.js 15 Project Scaffold

- Scaffolded Next.js 16.1.6 (latest at time of execution) App Router project with TypeScript, Tailwind CSS v4, ESLint, `src/` directory layout, and `@/*` import alias
- Installed all 10 Phase 1 dependencies in one command
- Initialized shadcn/ui with New York style and CSS variables
- Updated `next.config.ts` to allow `*.r2.dev` image domains for Cloudflare R2 thumbnail serving
- Replaced default `page.tsx` with minimal placeholder ("Softball Mechanics — coming soon")
- Created `.env.local.example` with all 10 required environment variables documented
- `npm run build` passes with zero TypeScript or lint errors

### Task 2: Supabase Migration SQL

- Created `supabase/migrations/001_initial_schema.sql` with complete Phase 1 database schema
- 3 tables: `profiles`, `coach_athletes`, `videos`
- RLS enabled on all 3 tables
- 10 RLS policies total (4 profiles + 3 coach_athletes + 3 videos)
- `handle_new_user` trigger auto-creates a profile row for every new `auth.users` entry, defaulting role to `coach` from `user_metadata`

## All Packages Installed (npm list --depth=0)

```
softball-mechanics-tmp@0.1.0
├── @aws-sdk/client-s3@3.999.0
├── @aws-sdk/s3-request-presigner@3.999.0
├── @supabase/ssr@0.8.0
├── @supabase/supabase-js@2.98.0
├── @tailwindcss/postcss@4.2.1
├── @tanstack/react-query@5.90.21
├── @types/node@20.19.35
├── @types/react-dom@19.2.3
├── @types/react@19.2.14
├── class-variance-authority@0.7.1
├── clsx@2.1.1
├── eslint-config-next@16.1.6
├── eslint@9.39.3
├── ffmpeg-static@5.3.0
├── hls.js@1.6.15
├── inngest@3.52.4
├── lucide-react@0.575.0
├── next@16.1.6
├── radix-ui@1.4.3
├── react-dom@19.2.3
├── react-dropzone@15.0.0
├── react@19.2.3
├── shadcn@3.8.5
├── tailwind-merge@3.5.0
├── tailwindcss@4.2.1
├── tw-animate-css@1.4.0
├── typescript@5.9.3
└── zod@4.3.6
```

## Schema Summary

| Table | Columns | RLS Policies |
|-------|---------|-------------|
| `profiles` | id (PK, FK auth.users), role, full_name, avatar_url, created_at | 4 (select_own, insert_own, update_own, select_coach_athletes) |
| `coach_athletes` | id, coach_id, athlete_id (nullable), athlete_email, status, invited_at, joined_at | 3 (select_own, insert_coach, update_coach) |
| `videos` | id, athlete_id, uploaded_by, coach_id, title, raw_r2_key, hls_url, thumbnail_url, status, duration_seconds, uploaded_at, transcoded_at | 3 (select_coach, select_athlete, insert_authenticated, update_coach) |

**Trigger:** `on_auth_user_created` → calls `handle_new_user()` which inserts into `profiles` with role from `raw_user_meta_data` (defaults to `'coach'`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scaffolded Next.js in temp directory due to .planning/ conflict**
- **Found during:** Task 1
- **Issue:** `create-next-app` refused to scaffold into the project directory because `.planning/` already existed, producing: "The directory softball-mechanics contains files that could conflict"
- **Fix:** Scaffolded into `/Users/abhishekhodavdekar/git/softball-mechanics-tmp`, then used `rsync` to copy all files (excluding `.git`, `node_modules`, `README.md`) into the main project directory
- **Files modified:** All scaffold files copied to project root
- **Commit:** 31987f4

**2. [Rule 2 - Missing Critical] Added .env.local.example exception to .gitignore**
- **Found during:** Task 1 (pre-commit staging)
- **Issue:** The default Next.js `.gitignore` includes `.env*` which blocked staging `.env.local.example`. This file contains no secrets (all values blank) and must be committed for documentation
- **Fix:** Added `!.env.local.example` exception after the `.env*` line in `.gitignore`
- **Files modified:** `.gitignore`
- **Commit:** 31987f4

## Task Commit Log

| Task | Name | Commit |
|------|------|--------|
| 1 | Scaffold Next.js 15 + install all Phase 1 dependencies | 31987f4 |
| 2 | Write Supabase migration SQL with complete schema and RLS policies | 57e9fdb |

## Self-Check: PASSED

All files verified on disk:
- package.json: FOUND
- next.config.ts: FOUND
- components.json: FOUND
- .env.local.example: FOUND
- supabase/migrations/001_initial_schema.sql: FOUND
- 01-01-SUMMARY.md: FOUND

All commits verified in git log:
- 31987f4: FOUND
- 57e9fdb: FOUND
