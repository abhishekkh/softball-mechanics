---
phase: 05-branding-and-marketing
plan: 04
subsystem: ui
tags: [nextjs, metadata, seo, favicon, svg, opengraph]

# Dependency graph
requires:
  - phase: 05-01
    provides: root layout metadata with title.template = '%s | Diamond Mechanics'
  - phase: 05-02
    provides: landing page with OG image reference in layout.tsx
  - phase: 05-03
    provides: Diamond Mechanics brand rename across all app routes
provides:
  - Per-page metadata on all 5 app routes (Dashboard, Upload, Review, Roster, Submissions)
  - Brand favicon (icon.svg) — blue diamond mark at src/app/icon.svg
  - OG image placeholder at public/opengraph-image.png
affects: [05-branding-and-marketing, seo, social-sharing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js App Router metadata export pattern: export const metadata: Metadata = { title, description } on each server component page"
    - "Title template inheritance: root layout sets title.template = '%s | Diamond Mechanics', per-page exports only need the short title"
    - "OG image via explicit metadata in layout.tsx pointing to /opengraph-image.png in public/ — avoids duplicate og:image from file-convention auto-detection"

key-files:
  created:
    - src/app/icon.svg
    - public/opengraph-image.png
  modified:
    - src/app/(app)/dashboard/page.tsx
    - src/app/(app)/upload/page.tsx
    - src/app/(app)/review/[videoId]/page.tsx
    - src/app/(app)/roster/page.tsx
    - src/app/(app)/submissions/page.tsx

key-decisions:
  - "OG image placed in public/ (not src/app/) to use Option B: explicit metadata.openGraph.images in layout.tsx pointing to /opengraph-image.png — avoids duplicate og:image tags from Next.js file-convention auto-detection"
  - "OG image is a placeholder PNG (1x1 minimal valid PNG) — proper 1200x630 branded image deferred to pre-production launch"
  - "Static title 'Review' used for dynamic /review/[videoId] route — dynamic per-video titles deferred to future enhancement"

patterns-established:
  - "Per-page metadata: each server component page exports `export const metadata: Metadata = { title, description }` above the default export"
  - "Favicon: src/app/icon.svg with #2563eb fill — Next.js App Router auto-detects and injects <link rel='icon' type='image/svg+xml'>"

requirements-completed: [BRAND-05]

# Metrics
duration: 15min
completed: 2026-03-03
---

# Phase 05 Plan 04: SEO and Brand Assets Summary

**Browser tab titles and Diamond blue favicon delivered across all 5 app routes; OG image placeholder in place with explicit metadata wiring in root layout**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-03T10:05:00Z
- **Completed:** 2026-03-03T16:58:59Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint, approved)
- **Files modified:** 7

## Accomplishments
- All 5 app routes (Dashboard, Upload, Review, Roster, Submissions) now export `metadata` with title and description — browser tabs show `[Page] | Diamond Mechanics`
- Brand favicon (blue diamond SVG) created at `src/app/icon.svg` — replaces Next.js default boilerplate
- OG image placeholder created at `public/opengraph-image.png` — Next.js build accepts it; root layout already references `/opengraph-image.png` via explicit `openGraph.images`
- Human-verify checkpoint approved — coach confirmed correct tab titles and diamond favicon in browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-page metadata to all app routes** - `9a6a2f6` (feat)
2. **Task 2: Create brand favicon (icon.svg) and OG image (opengraph-image.png)** - `ac5ae5d` (feat)
3. **Task 3: Human visual verification checkpoint** - approved by user (no commit — verification only)

## Files Created/Modified
- `src/app/icon.svg` - Diamond shape favicon in brand blue (#2563eb), 32x32 SVG polygon
- `public/opengraph-image.png` - Placeholder 1x1 white PNG; proper 1200x630 branded image needed before production launch
- `src/app/(app)/dashboard/page.tsx` - Added `export const metadata: Metadata = { title: 'Dashboard', description: '...' }`
- `src/app/(app)/upload/page.tsx` - Added `export const metadata: Metadata = { title: 'Upload', description: '...' }`
- `src/app/(app)/review/[videoId]/page.tsx` - Added `export const metadata: Metadata = { title: 'Review', description: '...' }`
- `src/app/(app)/roster/page.tsx` - Added `export const metadata: Metadata = { title: 'Roster', description: '...' }`
- `src/app/(app)/submissions/page.tsx` - Added `export const metadata: Metadata = { title: 'Submissions', description: '...' }`

## Decisions Made
- **OG image in public/ not src/app/:** Plan 01 added an explicit `openGraph.images` array in `src/app/layout.tsx` pointing to `/opengraph-image.png`. Placing `src/app/opengraph-image.png` would cause Next.js to auto-inject a second `og:image` tag (duplicate). Chose Option B: keep file in `public/` and use explicit metadata only. No duplicate tags.
- **OG image is a placeholder:** Generating a real 1200x630 branded PNG requires design tooling not available at execution time. A minimal valid 1x1 PNG was written. A proper branded OG image should be created before production launch.
- **Static "Review" title on dynamic route:** The review/[videoId] route uses a static `title: 'Review'` — sufficient for v1. Dynamic per-video titles (e.g. "Review — @athlete") are a future enhancement.

## Deviations from Plan

None — plan executed exactly as written. The OG image placement in `public/` was explicitly documented as Option B in the plan's Task 2 action block.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Phase 05 SEO/meta layer complete — all 5 app routes have branded tab titles, diamond favicon is live
- **Action needed before production launch:** Replace `public/opengraph-image.png` with a proper 1200x630 branded image (Diamond Mechanics wordmark + diamond mark on brand background)
- Phase 05 (branding and marketing) is fully complete — all 4 plans done

---
*Phase: 05-branding-and-marketing*
*Completed: 2026-03-03*
