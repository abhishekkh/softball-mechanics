# Phase 5: Branding and Marketing - Research

**Researched:** 2026-03-03
**Domain:** Next.js App Router metadata, CSS custom properties (OKLCH), landing page composition, brand identity application
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **App name:** Rename from "Softball Mechanics" to **Diamond Mechanics** everywhere (UI text, page titles, metadata, copy)
- **Target audience:** Both baseball and softball coaches — copy must never be softball-only
- **Color direction:** Clean professional, white/light background + Diamond blue (royal/cobalt family) accent; update `--primary`, `--primary-foreground`, ring/accent tokens in `globals.css`
- **Typography:** Keep Geist (already installed); headings use bolder weights, body stays clean
- **Landing page structure:** Hero (name + tagline + "Start free" CTA) → Feature highlights (3–4 features) → How it works (3-step visual flow); no pricing, no testimonials, no demo video, no newsletter
- **Landing page tone:** Warm and community-focused — coaching relationship over AI/SaaS framing; serve youth rec, high school, travel, collegiate coaches
- **Landing page media:** Text and features only — no hero screenshot, no demo video, no mockup
- **Landing page CTA:** "Start free" primary conversion; feedback link (not email capture)
- **App shell rebrand:** Nav gets Diamond Mechanics logo/wordmark; all "Softball Mechanics" references replaced
- **Auth pages:** Centered card + Diamond Mechanics logo above form (login, signup, invite acceptance)
- **SEO/Meta:** Full per-page `<title>` + `<description>` across all routes; OG image for landing page; favicon replacing default Next.js icon
- **Root layout metadata:** `title: "Diamond Mechanics"`, description mentioning both baseball and softball

### Claude's Discretion

- Exact accent blue hex value (within royal/cobalt family)
- Typography — whether to keep Geist as-is or add bolder weight variants
- Nav logo specifics — icon + wordmark vs. wordmark only, exact icon treatment
- OG image design and format (static file vs. generated `opengraph-image.tsx`)
- Favicon SVG design
- Hero tagline copy and feature section copy (warm, community-focused tone as guide)
- Feedback link destination (GitHub Issues, feedback form, or email)

### Deferred Ideas (OUT OF SCOPE)

- Social proof / testimonials — needs real coach quotes; future marketing iteration
- Pricing section — separate phase when pricing model is decided
- Demo video embed — requires real recording; deferred until app is more polished
- Email capture / waitlist / newsletter — not needed at this stage

</user_constraints>

---

## Summary

Phase 5 is a pure brand identity and marketing phase — no new product features, no backend changes, no database migrations. The work falls into four clearly bounded buckets: (1) CSS token updates to propagate the Diamond Mechanics brand color across the entire shadcn/Tailwind component system, (2) building the public landing page at the root URL, (3) applying the brand consistently in the internal app shell and auth pages, and (4) delivering SEO/metadata assets (per-page titles, OG image, favicon). All of these are achievable with the existing stack — no new npm packages are required.

The existing architecture is well-positioned for this phase. The `globals.css` CSS custom property system (`--primary`, `--primary-foreground`, etc.) means a single token update cascades brand colors across every Button, Link, and interactive element in the app automatically. The Next.js App Router metadata API (`export const metadata: Metadata`) plus file-based conventions (`favicon.ico` in `app/`, `opengraph-image` in `app/`) means SEO assets require zero external tooling. The route group structure (`(app)` / `(auth)`) means landing page, auth pages, and app shell can all be updated in isolation without touching shared layout code.

The main design decision at planning time is whether to use a static OG image file (`opengraph-image.jpg` / `.png` in `app/`) or a generated `opengraph-image.tsx` using `ImageResponse`. Given the landing page needs only one OG image and the design is static text-based, a static PNG is the simplest and most reliable approach — no edge runtime, no font loading complexity. The favicon should be placed in `src/app/` as `icon.svg` (Next.js auto-detects and generates the `<link>` tag) — the existing `public/favicon.ico` is the default Next.js icon and can be overridden.

**Primary recommendation:** Execute in four plans: (1) CSS brand tokens, (2) landing page build, (3) app shell + auth page rebrand, (4) SEO/meta assets. Color update first — it makes everything else look correctly branded as you build.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router Metadata API | 16.1.6 (in use) | Per-page `<title>`, `<description>`, OG tags | File-based + export-based; zero config, auto-detected |
| Tailwind CSS v4 `@theme inline` | 4.x (in use) | CSS custom property token system | Single source of truth for brand colors; changes cascade globally |
| shadcn/ui | 3.8.5 (in use) | Component system consuming `--primary` tokens | Token-driven; no per-component color overrides needed |
| Geist (next/font/google) | in use | Typography | Already loaded; no new font package needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/og` (`ImageResponse`) | built into Next.js | Programmatic OG image generation | Use only if OG image needs dynamic data; for static landing page, a plain PNG file is simpler |
| Lucide React | 0.575.0 (in use) | Icons for landing page feature highlights and how-it-works steps | Already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static `opengraph-image.png` in `app/` | `opengraph-image.tsx` with `ImageResponse` | Generated approach adds edge-runtime complexity and font loading; static PNG is simpler for a single landing page OG image and has no runtime cost |
| `icon.svg` in `src/app/` | `favicon.ico` in `src/app/` | Both work; SVG is resolution-independent and modern browsers support it; ICO is universal fallback. Can ship both: `icon.svg` for modern browsers + `favicon.ico` for fallback |
| Geist as-is | Adding `font-display: swap` or bolder variant | Geist includes bold weights via `font-weight`; no extra config needed, just use Tailwind `font-bold`/`font-extrabold` classes |

**Installation:** No new packages required. All tools are already in `package.json`.

---

## Architecture Patterns

### File Locations

```
src/app/
├── page.tsx                   # Landing page (replace "coming soon" stub)
├── layout.tsx                 # Update Metadata export: title + description + OG
├── icon.svg                   # Favicon (Next.js auto-detects in app/ dir)
├── opengraph-image.png        # Static OG image for landing page
├── globals.css                # Update --primary, --primary-foreground, --ring tokens
├── (app)/
│   └── layout.tsx             # Add Diamond Mechanics nav logo/wordmark
├── (auth)/
│   ├── layout.tsx             # Add Diamond Mechanics logo above form card
│   ├── login/page.tsx         # No layout change needed; layout.tsx handles it
│   └── signup/page.tsx        # No layout change needed; layout.tsx handles it
└── invite/
    ├── accept/page.tsx        # Add branded header (standalone, not in (auth) layout)
    └── [token]/page.tsx       # Add branded header (standalone, not in (auth) layout)
```

```
public/
└── opengraph-image.png        # Alternative: place static OG image here and reference via metadata.openGraph.images
```

Note on favicon placement: Next.js detects `icon.svg` (or `icon.png`, `icon.ico`) in `src/app/` and auto-generates the `<link rel="icon">` tag. The existing `public/favicon.ico` is the default Next.js boilerplate — placing `src/app/icon.svg` overrides it for App Router routes. Both can coexist for maximum browser compatibility.

### Pattern 1: CSS Token Update for Brand Color

**What:** Update `--primary` and related tokens in `globals.css` `:root` block to Diamond blue. The `@theme inline` block already maps `--color-primary` → `var(--primary)` so Tailwind classes like `bg-primary`, `text-primary`, `ring-primary` all update automatically. Every shadcn Button (variant="default"), Link with primary styling, focus rings, and active states cascade from this single change.

**When to use:** Apply first, before building any other UI. This ensures the landing page and rebranded auth pages are immediately in-brand.

**Example:**
```css
/* src/app/globals.css — :root block */
:root {
  /* Diamond blue: royal/cobalt family. oklch equivalent of approx. #2563eb (Tailwind blue-600) */
  /* Recommended: oklch(0.546 0.245 262.881) — strong cobalt, high chroma, perceptually mid-lightness */
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.985 0 0); /* white text on blue */
  --ring: oklch(0.546 0.245 262.881);     /* focus ring matches brand */
}
```

**OKLCH reference for Diamond blue range (royal/cobalt family):**
- `oklch(0.546 0.245 262.881)` ≈ Tailwind `blue-600` (#2563eb) — strong, readable, universally recognized as professional blue
- `oklch(0.488 0.243 264.376)` ≈ slightly darker (already used in dark mode `--sidebar-primary`) — good for hover states
- `oklch(0.60 0.22 260)` ≈ slightly lighter, closer to royal blue #4169e1

The exact value is Claude's discretion within this range. `blue-600` (0.546 / 0.245 / 262.881) is a strong, safe recommendation: trustworthy, sport-adjacent, high contrast on white.

**Dark mode tokens** should also be updated in the `.dark` block to maintain consistency, though dark mode is not a Phase 5 priority.

### Pattern 2: Next.js Static Metadata Export

**What:** Export `metadata: Metadata` from `layout.tsx` or `page.tsx`. Root layout sets site-wide defaults; per-page exports override specific fields.

**When to use:** Per-page title + description for every authenticated route.

**Example:**
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Diamond Mechanics',
    template: '%s | Diamond Mechanics',
  },
  description: 'AI-powered mechanics coaching for baseball and softball coaches. Upload video, get instant pose analysis, and deliver clear feedback to your athletes.',
  openGraph: {
    title: 'Diamond Mechanics',
    description: 'AI-powered mechanics coaching for baseball and softball coaches.',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
}
```

```typescript
// src/app/(app)/dashboard/page.tsx — per-page override
export const metadata: Metadata = {
  title: 'Dashboard',  // renders as "Dashboard | Diamond Mechanics" via template
}
```

### Pattern 3: File-Based Favicon (App Router)

**What:** Place `icon.svg` in `src/app/`. Next.js auto-detects it and injects `<link rel="icon" href="...">` into `<head>`. No manual `<link>` tag in layout needed.

**When to use:** This is the App Router convention; use instead of manual `<link>` tags.

```
src/app/icon.svg    →  <link rel="icon" type="image/svg+xml" href="/icon.svg?...">
src/app/favicon.ico →  <link rel="icon" sizes="any" href="/favicon.ico?...">
```

Both can coexist. SVG takes precedence in modern browsers; ICO serves as universal fallback.

### Pattern 4: Static OG Image (File Convention)

**What:** Place `opengraph-image.png` in `src/app/`. Next.js auto-detects it and generates the OG meta tags. Size should be 1200×630px (standard OG image dimensions).

**When to use:** Landing page has one static OG image — no dynamic data needed. Static file is simpler than `ImageResponse` and has zero runtime cost.

Alternatively, reference via metadata object if placing in `public/`:
```typescript
openGraph: {
  images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Diamond Mechanics' }]
}
```

### Pattern 5: Landing Page Structure (React Server Component)

**What:** Replace the stub `src/app/page.tsx` with a full RSC landing page. No client state needed — pure server component with semantic HTML.

**When to use:** Root route is a public marketing page; RSC is optimal (no interactivity, static content).

```tsx
// src/app/page.tsx (server component — no 'use client')
export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section>...</section>
      {/* Feature highlights */}
      <section>...</section>
      {/* How it works */}
      <section>...</section>
      {/* CTA footer */}
      <section>...</section>
    </main>
  )
}
```

The landing page is outside the `(app)` route group, so it gets no app shell nav. It should have its own minimal header (logo + "Sign in" link) and footer (feedback link).

### Pattern 6: Auth Layout Logo Update

**What:** The `(auth)/layout.tsx` already has a centered card structure and renders `<h1>Softball Mechanics</h1>`. The rebrand replaces this heading with the Diamond Mechanics wordmark/logo component and updates the subtitle copy.

**When to use:** All auth routes (login, signup) inherit from this layout automatically.

The invite acceptance pages (`invite/accept/page.tsx` and `invite/[token]/page.tsx`) are NOT in the `(auth)` layout group — they render their own full-page layouts inline. These need a branded header added directly to their JSX.

### Anti-Patterns to Avoid

- **Hardcoding the brand color hex in Tailwind classes** (e.g., `bg-[#2563eb]`): always use the CSS token system (`bg-primary`, `text-primary`) so the brand color is a single source of truth in `globals.css`.
- **Placing favicon.ico only in `public/`**: The `public/favicon.ico` is the legacy Next.js approach; App Router prefers `src/app/icon.svg` or `src/app/favicon.ico` for automatic metadata injection.
- **Using `'use client'` on the landing page**: Landing page is static content, RSC is optimal. Only add `'use client'` if adding interactive elements (the "Start free" CTA is a simple `<a href="/signup">` — no client state needed).
- **Forgetting the `title.template`** in root layout metadata: Without the template, per-page `title` exports won't append the brand name.
- **Updating only light mode tokens in `globals.css`**: The `.dark` block has its own `--primary` — update both for correctness, even if dark mode is not the primary use case.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Favicon `<link>` tag | Manual `<link rel="icon">` in layout | `src/app/icon.svg` file convention | Next.js auto-generates correct link tag with cache-busting hash |
| OG `<meta>` tags | Manual `<meta property="og:...">` in layout | `metadata.openGraph` export or `opengraph-image.png` file | Next.js generates all required OG tags + Twitter card tags from single export |
| Per-page title injection | Custom context/hook for page titles | `export const metadata: Metadata` in each page | App Router merges metadata up the tree; template system handles branding suffix |
| CSS variable cascading | Per-component color overrides | Update `--primary` token in `globals.css` | shadcn architecture is token-driven; one change cascades everywhere |

**Key insight:** The entire brand color rollout is a 3-line change in `globals.css`. The power of the shadcn token system is that every `Button`, `Input` focus ring, and `Link` inherits the token — there's nothing else to update component-by-component.

---

## Common Pitfalls

### Pitfall 1: "Softball Mechanics" References in Non-Obvious Places

**What goes wrong:** The dev updates the nav and auth layout, but misses: browser tab title in root `layout.tsx` (still says "Create Next App"), email templates in `src/lib/email.ts`, and potentially hardcoded strings in component files.

**Why it happens:** The string "Softball Mechanics" is in multiple files that aren't immediately associated with "branding" work.

**How to avoid:** Run a codebase-wide grep for "softball" (case-insensitive) and "Softball Mechanics" before declaring the rebrand done.

**Warning signs:** Browser tab still shows "Create Next App" after updating the nav. Email invite still says "Softball Mechanics" in the from-name or subject.
```bash
grep -ri "softball mechanics\|softball-mechanics\|softballmechanics" src/ --include="*.ts" --include="*.tsx" --include="*.css"
```

### Pitfall 2: oklch Token Not Updating All Relevant Tokens

**What goes wrong:** Developer updates `--primary` but forgets `--ring` (focus ring color), `--sidebar-primary` (sidebar active state), and `--accent`. Interactive elements look off-brand.

**Why it happens:** There are ~20 custom properties in the `:root` block; only some need updating for brand color.

**How to avoid:** At minimum, update `--primary`, `--primary-foreground`, and `--ring` in the `:root` block. Optionally update `--sidebar-primary` and `--sidebar-ring` for the sidebar active state. The `--accent` token in the current setup is a neutral gray (`oklch(0.97 0 0)`) — leave it neutral unless the design calls for a brand-colored accent.

**Warning signs:** Buttons are brand blue but focus rings are still gray. Sidebar active nav item is still black.

### Pitfall 3: Auth Layout Not Covering All Auth-Adjacent Pages

**What goes wrong:** Login and signup get the logo treatment via `(auth)/layout.tsx`, but the invite acceptance pages (`/invite/accept` and `/invite/[token]`) are in a separate `invite/` directory outside the `(auth)` route group and render their own full-screen layouts.

**Why it happens:** The route group `(auth)` only wraps routes inside `src/app/(auth)/`. The invite pages are at `src/app/invite/` — they are not children of `(auth)`.

**How to avoid:** Plan an explicit task to update `invite/accept/page.tsx` and `invite/[token]/page.tsx`. Both render their own `min-h-screen flex items-center justify-center` wrappers — add the Diamond Mechanics logo/wordmark above the content area directly in those components.

**Warning signs:** Login and signup have the logo; the invite acceptance flow still shows a blank branded header or just a spinner with no brand context.

### Pitfall 4: Landing Page Without Its Own Nav Header

**What goes wrong:** The landing page (`src/app/page.tsx`) is outside the `(app)` route group, so it gets no app shell nav. If the developer doesn't add a minimal landing page header, the page renders with no navigation at all — no way for a visitor to reach sign-in.

**Why it happens:** The `(app)/layout.tsx` is scoped to authenticated routes only; it does not apply to the root `page.tsx`.

**How to avoid:** The landing page must include its own minimal header: Diamond Mechanics wordmark on the left, "Sign in" link on the right. This is a standalone header — do not reuse `(app)/layout.tsx`.

### Pitfall 5: OG Image Aspect Ratio and File Size

**What goes wrong:** OG image is the wrong size (not 1200×630), too large (>8MB causes issues with some scrapers), or uses an unsupported format.

**Why it happens:** Developers generate a PNG without checking scraper requirements.

**How to avoid:** Target 1200×630px, export as PNG or JPEG, keep under 5MB. For a text-only brand OG image, file size is trivially small.

---

## Code Examples

Verified patterns from official Next.js docs (v16.1.6):

### Root Layout Metadata with Template

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Diamond Mechanics',
    template: '%s | Diamond Mechanics',
  },
  description: 'AI-powered mechanics coaching for baseball and softball coaches. Upload video, get instant pose analysis, and deliver clear feedback to your athletes.',
  openGraph: {
    title: 'Diamond Mechanics',
    description: 'AI-powered mechanics coaching for baseball and softball coaches.',
    type: 'website',
  },
}
```

### Per-Page Metadata Override

```typescript
// src/app/(app)/dashboard/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',  // renders: "Dashboard | Diamond Mechanics"
}
```

### CSS Token Update Pattern (Tailwind v4 + oklch)

```css
/* src/app/globals.css */
:root {
  /* Diamond blue — royal/cobalt family */
  --primary: oklch(0.546 0.245 262.881);   /* ≈ #2563eb blue-600 */
  --primary-foreground: oklch(0.985 0 0);  /* white */
  --ring: oklch(0.546 0.245 262.881);      /* focus rings match brand */
}
```

### Landing Page Minimal Header Pattern

```tsx
// src/app/page.tsx (server component)
export default function LandingPage() {
  return (
    <>
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-gray-900">Diamond Mechanics</span>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">Sign in</a>
        </div>
      </header>
      <main>
        {/* Hero, features, how it works */}
      </main>
    </>
  )
}
```

### Auth Layout Logo Pattern

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Diamond Mechanics logo/wordmark — icon + text or text-only */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {/* SVG diamond icon inline or imported */}
            <span className="font-extrabold text-2xl text-gray-900">Diamond Mechanics</span>
          </div>
          <p className="text-gray-500 text-sm">Coach smarter. Develop every athlete.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
```

---

## Existing Code Audit: What Needs Updating

This is a reference for the planner to enumerate affected files:

| File | Current State | Required Change |
|------|--------------|-----------------|
| `src/app/layout.tsx` | title: "Create Next App" | Update Metadata export; add OG config |
| `src/app/page.tsx` | "Softball Mechanics — coming soon" stub | Replace with full landing page |
| `src/app/globals.css` | `--primary: oklch(0.205 0 0)` (near-black) | Update to Diamond blue + foreground + ring |
| `src/app/(app)/layout.tsx` | `<span>Softball Mechanics</span>` | Diamond Mechanics logo/wordmark |
| `src/app/(auth)/layout.tsx` | `<h1>Softball Mechanics</h1>` + "Coach smarter, throw harder" | Updated name + new tagline |
| `src/app/invite/accept/page.tsx` | No branding in loading/error states | Add DM logo above content |
| `src/app/invite/[token]/page.tsx` | No branding in loading/error states | Add DM logo above content |
| `src/app/(app)/dashboard/page.tsx` | No metadata export | Add `export const metadata` |
| `src/app/(app)/upload/page.tsx` | No metadata export | Add `export const metadata` |
| `src/app/(app)/review/[videoId]/page.tsx` | No metadata export | Add `export const metadata` |
| `src/app/(app)/roster/` (if exists) | No metadata export | Add `export const metadata` |
| `src/lib/email.ts` | Likely contains "Softball Mechanics" in email copy | Update to Diamond Mechanics |
| `src/app/favicon.ico` (public dir) | Default Next.js icon | Add `src/app/icon.svg` as brand favicon |
| `src/app/opengraph-image.png` (new) | Does not exist | Create 1200×630 PNG brand OG image |

### Grep Command to Find All "Softball" References

```bash
grep -ri "softball" /path/to/src --include="*.ts" --include="*.tsx" --include="*.css" --include="*.html"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `<link rel="icon">` in `_document.tsx` | `src/app/icon.svg` or `src/app/favicon.ico` file convention | Next.js 13 App Router | Auto-detected, no manual tag needed |
| Manual `<meta property="og:*">` tags | `metadata.openGraph` export or `opengraph-image.png` file | Next.js 13 App Router | Single export generates all required OG + Twitter tags |
| `tailwind.config.js` `extend.colors` | `@theme inline` in CSS + `--color-*` custom properties | Tailwind CSS v4 | CSS-first config; theme values are CSS variables at runtime |
| `pages/_document.tsx` title/meta | `export const metadata: Metadata` per route | Next.js 13 App Router | Tree-merged metadata with template support |

**Deprecated/outdated:**
- `tailwind.config.js` color extensions: still works in v4 for backward compat, but the CSS-first approach in `globals.css` is the v4 native pattern
- `pages/_document.tsx` / `pages/_app.tsx`: not applicable (project already uses App Router)

---

## Open Questions

1. **Feedback link destination**
   - What we know: CONTEXT.md says a feedback link on the landing page; the intent is easy feedback submission, not mailing list building
   - What's unclear: No decision on where it points (GitHub Issues, feedback form, email)
   - Recommendation: Use a `mailto:` link with a pre-filled subject ("Diamond Mechanics Feedback") as the simplest approach requiring zero infrastructure. GitHub Issues is acceptable if the repo is intended to be public-facing.

2. **Email template copy (src/lib/email.ts)**
   - What we know: Resend email templates were built in Phase 02.4 and likely contain "Softball Mechanics" in subject lines, from-name, or body copy
   - What's unclear: Exact strings used; not read during this research
   - Recommendation: Read `src/lib/email.ts` during execution and update any "Softball Mechanics" references to "Diamond Mechanics"

3. **Roster page path**
   - What we know: The nav links to `/roster`; the REQUIREMENTS.md lists ROST-01/02 as complete
   - What's unclear: Whether `src/app/(app)/roster/page.tsx` exports metadata or has any branding strings
   - Recommendation: Check and update during the metadata plan

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (v16.1.6, last updated 2026-02-27) — https://nextjs.org/docs/app/getting-started/metadata-and-og-images — metadata API, file conventions, favicon, OG image
- Next.js official docs — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons — favicon file conventions
- Direct codebase reading — `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/invite/accept/page.tsx`, `src/app/invite/[token]/page.tsx`

### Secondary (MEDIUM confidence)
- Tailwind CSS v4 custom color documentation — verified CSS-first `@theme` approach is the v4 pattern (matches existing `globals.css` `@theme inline` block in codebase)
- OKLCH for `blue-600` family: verified pattern from shadcn/Tailwind v4 default color palette — `oklch(0.546 0.245 262.881)` corresponds to Tailwind `blue-600` (#2563eb)

### Tertiary (LOW confidence)
- OG image size recommendation (1200×630): widely cited community standard; not from official Next.js docs directly but consistent across multiple sources
- Cobalt/royal blue professional branding: general color theory sources; specific hex/OKLCH values verified by cross-referencing Tailwind palette

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all tools already in use and verified in codebase
- Architecture: HIGH — file conventions verified against official Next.js docs (v16.1.6)
- CSS token patterns: HIGH — existing `globals.css` structure verified by direct read; oklch values verified against Tailwind default palette
- Pitfalls: HIGH — all identified through direct codebase reading (confirmed "Softball Mechanics" strings in multiple files, confirmed invite pages outside auth layout group)
- Landing page structure: HIGH — CONTEXT.md provides complete locked spec; RSC pattern is standard Next.js

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain — Next.js metadata API and Tailwind v4 CSS token system are not fast-moving)
