---
phase: 05-branding-and-marketing
plan: "03"
subsystem: branding
tags: [branding, rename, ui, email, inngest]
dependency_graph:
  requires: [05-01]
  provides: [BRAND-01, BRAND-04]
  affects: [app-nav, auth-layout, invite-pages, email-templates, upload-consent, inngest-client]
tech_stack:
  added: []
  patterns: [inline-svg-icon, wordmark-branding]
key_files:
  created: []
  modified:
    - src/app/(app)/layout.tsx
    - src/app/(auth)/layout.tsx
    - src/app/invite/accept/page.tsx
    - src/app/invite/[token]/page.tsx
    - src/actions/auth.ts
    - src/actions/feedback.ts
    - src/components/upload/UploadPageClient.tsx
    - src/inngest/client.ts
decisions:
  - "Diamond SVG diamond-shape icon (path M10 2L18 10L10 18L2 10L10 2Z) used as wordmark logo mark — matches brand identity with minimal markup"
  - "text-primary class on SVG path leverages brand blue oklch token from Plan 01 — no hardcoded color"
  - "Inngest app id changed from softball-mechanics to diamond-mechanics — Inngest Cloud will treat as new app, acceptable for rebrand"
  - "Consent text broadened to 'baseball and softball mechanics analysis' (not just 'softball') — more inclusive and accurate"
  - "src/lib/email.ts confirmed clean — no Softball Mechanics strings, no change needed"
  - "Lowercase 'softball mechanics' in code comments (angles.ts) intentionally preserved — scientific/technical description, not user-facing brand"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 8
---

# Phase 5 Plan 3: Brand Rename — Diamond Mechanics Summary

Pure rebrand of all user-facing "Softball Mechanics" strings to "Diamond Mechanics" across app nav, auth pages, invite acceptance pages, transactional emails, consent text, and the Inngest client identifier.

## What Was Built

### Task 1: App Shell Nav and Auth Layout (commit 4ec9a59)

**src/app/(app)/layout.tsx:**
- Replaced `<span className="font-bold text-gray-900">Softball Mechanics</span>` with a diamond SVG icon + `<span className="font-extrabold text-gray-900">Diamond Mechanics</span>` wrapped in a flex container
- SVG path `M10 2L18 10L10 18L2 10L10 2Z` renders a diamond shape at 20x20px
- SVG fill uses `className="text-primary"` to inherit the brand blue token from Plan 01

**src/app/(auth)/layout.tsx:**
- Replaced `<h1>Softball Mechanics</h1>` with a flex div containing the same 24x24px diamond SVG + `<span className="text-2xl font-extrabold text-gray-900">Diamond Mechanics</span>`
- Updated tagline from `"Coach smarter, throw harder"` to `"Coach smarter. Develop every athlete."`

### Task 2: Invite Pages, Emails, Consent Text, Inngest Client (commit 82955c8)

**src/app/invite/accept/page.tsx:**
- Added `<div className="mb-8"><span className="text-xl font-extrabold text-gray-900">Diamond Mechanics</span></div>` above status content in all three branches: loading, success, error

**src/app/invite/[token]/page.tsx:**
- Same branded header treatment above all three status states (loading, success, error)

**src/actions/auth.ts:**
- Invite email body: `"Your coach has invited you to the Softball Mechanics app"` → `"Your coach has invited you to Diamond Mechanics"`

**src/actions/feedback.ts:**
- Feedback email footer: `"via the Softball Mechanics app"` → `"via Diamond Mechanics"`

**src/components/upload/UploadPageClient.tsx:**
- Consent text: `"used solely for softball mechanics analysis"` → `"used solely for baseball and softball mechanics analysis"`

**src/inngest/client.ts:**
- Inngest app id: `'softball-mechanics'` → `'diamond-mechanics'`

**src/lib/email.ts:**
- Grepped: no "Softball Mechanics" strings found — no change needed

## Logo Treatment Decision

Diamond SVG icon + wordmark chosen over wordmark-only. The SVG uses an inline diamond polygon path (rotated square) at 20px (nav) / 24px (auth). The path fill is `className="text-primary"` inheriting the oklch brand blue from Plan 01's CSS token — not a hardcoded hex. This is lightweight, zero-dependency, and consistent with the app's existing inline SVG patterns.

## Intentionally Preserved "softball" References

The following references were deliberately NOT changed:

- `src/lib/pose/angles.ts` line ~80: `"Compute all three softball mechanics angles for a frame."` — This is a JSDoc code comment describing the technical function, not a user-facing brand string. Changing it would reduce code clarity.
- Any other lowercase `softball` in technical comments or scientific paper citations in `flags.ts`/`angles.ts` — these are domain-specific descriptors, not brand occurrences.

## Verification

All 6 plan verification checks passed:

1. Zero `Softball Mechanics` user-facing strings in src/ — PASS (0 results)
2. `Diamond Mechanics` in `src/app/(app)/layout.tsx` — PASS (line 16)
3. `Diamond Mechanics` in `src/app/(auth)/layout.tsx` — PASS (line 10)
4. `Diamond Mechanics` in `src/app/invite/accept/page.tsx` — PASS (lines 36, 50, 62)
5. `Diamond Mechanics` in `src/app/invite/[token]/page.tsx` — PASS (lines 60, 74, 86)
6. `diamond-mechanics` in `src/inngest/client.ts` — PASS (line 3)
7. `npm run build` — PASS (no errors, 17 static pages generated)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All modified files confirmed present on disk. Both task commits (4ec9a59, 82955c8) confirmed in git log.
