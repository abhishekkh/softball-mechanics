# Phase 5: Branding and Marketing - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebrand the app from "Softball Mechanics" to "Diamond Mechanics" (covering both baseball and softball), build the public-facing marketing landing page at the root URL, and apply the brand identity consistently across the internal app. This phase does not add new product features — it is purely brand identity, public marketing site, and marketing asset delivery.

</domain>

<decisions>
## Implementation Decisions

### App Name
- Rename from "Softball Mechanics" to **Diamond Mechanics**
- All UI text, page titles, metadata, and copy should use "Diamond Mechanics"
- The app serves coaches of both baseball and softball — copy and messaging should reflect both sports

### Visual Identity — Color Palette
- **Direction:** Clean professional (white/light background + sport accent)
- **Accent color:** Diamond blue (royal/cobalt) — Claude's discretion on exact hex, but a strong, trustworthy blue that reads as professional and sport-specific
- Update `globals.css` CSS custom properties (`--primary`, `--primary-foreground`, ring/accent tokens) to reflect Diamond Mechanics brand colors
- Buttons, links, active states, and key UI elements adopt the brand accent color

### Visual Identity — Typography
- Claude's discretion — keep or evolve Geist (already installed, no new font needed)
- Headings should use bolder weights to give more presence; body text stays clean and readable

### Landing Page — Structure
- **Hero section:** App name + tagline + "Start free" CTA button (primary conversion action)
- **Feature highlights:** 3–4 key features (video upload, AI pose analysis, mechanics flags, coaching feedback)
- **How it works:** 3-step visual flow (Upload video → Get AI breakdown → Deliver feedback)
- No pricing section, no testimonials/social proof section (deferred)
- **Tone:** Warm and community-focused — speaks to the coaching relationship, not just the technology
- **Target audience copy:** Any baseball or softball coach — youth rec leagues, high school, travel, collegiate all welcome

### Landing Page — Media and CTAs
- No hero screenshot, mockup, or demo video — text and features only for now
- **Feedback link** in the landing page (no email capture or waitlist form)
- No newsletter section

### App Branding — Internal App
- Rebrand the full internal app (nav, auth pages, browser tab titles)
- **Nav:** Diamond Mechanics logo/wordmark visible in the app shell nav — Claude's discretion on exact treatment (diamond icon + wordmark, or wordmark-only)
- **Auth pages (login, signup, invite acceptance):** Centered card layout with Diamond Mechanics logo above the form
- **App shell:** All instances of "Softball Mechanics" or placeholder text replaced

### Marketing Assets — SEO and Meta
- **Full treatment:** per-page `<title>` and `<description>` metadata across all routes
- Root layout: `title: "Diamond Mechanics"`, proper description mentioning baseball and softball
- Per-page titles: Dashboard, Upload, Review, Roster pages all get meaningful titles
- **OG/social sharing image** for the landing page (static image with brand identity — Claude's discretion on design)
- **Favicon:** Replace default Next.js favicon with a Diamond Mechanics brand mark (diamond shape, "DM" monogram, or similar — Claude's discretion)

### Claude's Discretion
- Exact accent blue hex value (within the royal/cobalt family)
- Typography treatment — whether to keep Geist as-is or add bolder weight variants
- Nav logo specifics — icon + wordmark vs. wordmark only, exact icon treatment
- OG image design and format
- Favicon SVG design
- Hero tagline copy and feature section copy (warm, community-focused tone as the guide)
- Feedback link destination (GitHub Issues, a feedback form, email — pick the most appropriate)

</decisions>

<specifics>
## Specific Ideas

- The app serves **both baseball and softball coaches** — this must come through in all copy. Do not use softball-only language anywhere in the marketing site or rebranded app.
- "Warm and community-focused" tone: think "help every athlete reach their potential" rather than "AI-powered SaaS platform." The coach-athlete relationship is the heart of the product.
- Landing page is purely text-driven for now — no screenshots or demo video needed. The feature highlights and how-it-works steps should carry the visual weight.
- Feedback link on landing page — the intent is to let early users/coaches easily submit feedback, not to build a mailing list.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/globals.css` — CSS custom properties (`--primary`, `--background`, `--accent` etc.) already structured as shadcn tokens; updating these values will cascade brand colors across the entire app
- `src/app/layout.tsx` — Root layout where `Metadata` export needs updating; Geist fonts already loaded here
- `src/app/(auth)/` — Auth route group exists; login/signup pages can be restyled here without touching the app shell
- `src/app/(app)/layout.tsx` — App shell nav lives here; logo/wordmark can be added to this server component

### Established Patterns
- shadcn/ui component system is in use — brand color changes propagate through `--primary` token to all Button, Link, and interactive components automatically
- Next.js App Router route groups `(app)` and `(auth)` cleanly separate the marketing site, auth pages, and app shell — the new marketing landing page fits as `src/app/page.tsx` (root, no route group)
- Tailwind CSS v4 + `@theme inline` for token mapping — brand color additions should follow this pattern

### Integration Points
- Root `src/app/page.tsx` — currently the "coming soon" placeholder; replace with the full landing page
- `src/app/layout.tsx` — update `Metadata` export here for root-level OG tags
- `public/` directory — add `favicon.ico` / `favicon.svg` here; add OG image here for static reference
- `src/app/(app)/layout.tsx` — add Diamond Mechanics logo to nav here
- `src/app/(auth)/` pages — add centered-card-with-logo layout to login, signup, invite acceptance

</code_context>

<deferred>
## Deferred Ideas

- Social proof / testimonials section — needs real coach quotes; add to landing page in a future marketing iteration
- Pricing section — not finalized; separate phase when pricing model is decided
- Demo video embed — requires a real recording of the app in action; deferred until app is more polished
- Email capture / waitlist / newsletter — not needed at this stage; may revisit if a launch campaign is planned

</deferred>

---

*Phase: 05-branding-and-marketing*
*Context gathered: 2026-03-03*
