# Retrospective

Living retrospective — append one section per milestone.

---

## Milestone: v1.0 — Diamond Mechanics MVP

**Shipped:** 2026-03-03
**Phases:** 9 | **Plans:** 38 | **Timeline:** 5 days (2026-02-26 → 2026-03-03)

### What Was Built

- Full video upload-to-HLS pipeline: presigned R2 upload, Inngest 5-step transcoding, hls.js playback
- Coach/athlete role separation with PKCE invite flow and role-scoped views
- MediaPipe AI pose analysis: skeleton overlay, joint angles (hip rotation/drive, elbow/arm slot, shoulder tilt), motion-specific mechanics flags covering hitting (Bat Casting) and pitching (Premature Shoulder Opening, Arm Circle Bent Elbow, Stride Off Power Line)
- Gemini Flash VLM commentary wired into review sidebar with DB persistence
- Branded Resend invite + feedback emails with auto-authenticating magic links (generateLink admin API)
- Production security: RLS ownership policies, rate limiting, React error boundaries, 84 Vitest tests
- Diamond Mechanics rebrand: public landing page, app-wide brand tokens, favicon, per-page SEO metadata
- Phase 06 gap closure: all 4 critical/high integration breaks from audit closed before archive

### What Worked

- **Decimal phase insertions** (2.1, 2.2, 2.3, 2.4, 2.5) allowed urgent work to slot in without disrupting the integer phase numbering for v2
- **Audit before archive** caught 4 real integration breaks that would have shipped broken to users — the formal audit step is worth running even when you think everything is done
- **TDD for integration-critical paths** (presign route, feedback email): test-first caught Zod UUID format issues and mock pattern issues early; tests now document the exact behavior contracts
- **Small atomic commits per task** made the git log tell a clear story and helped identify when/where bugs were introduced
- **Non-fatal email pattern** (Supabase invite already sent, Resend is supplementary): allowed email delivery to fail gracefully without blocking the core invite flow

### What Was Inefficient

- **Phase 02.1 left without SUMMARY.md**: the phase completed quickly but the summary was skipped, leaving it unverified in the audit — added noise to audit findings
- **Email CTA implemented twice**: Phase 2.4 shipped `/review/${videoId}` for feedback email, then Phase 06 had to fix it to `/submissions` — the athlete auth model for the review page should have been considered during 2.4 design
- **Invite email CTA similarly regressed**: shipped `/auth/callback` (broken), then `/login` (static, requires pre-existing session), then finally `generateLink()` (correct) — three iterations to land the right pattern
- **STATE.md and ROADMAP progress table drifted**: the Progress table in ROADMAP.md still showed Phase 6 as "Not started" after it was complete — these tables require manual sync

### Patterns Established

- **Role-aware resolvedCoachId**: athlete trusts client-provided coachId (from server-side resolved UploadPageClient), coach always uses `user.id` — never trust client coachId for coach role
- **Admin generateLink() for email CTAs**: always use `admin.auth.admin.generateLink({ type: 'invite' | 'magiclink' })` when embedding auth links in branded emails; never embed static paths that require pre-existing sessions
- **Exact-match for '/' in isPublicPath**: `p === '/' ? pathname === '/' : pathname.startsWith(p)` — `startsWith('/')` matches every path
- **vi.hoisted() + dynamic import** for Vitest route handler tests: `vi.resetModules()` + `await import()` in `beforeEach` is required when mocking module-level state in Next.js route handlers
- **Vitest RFC 4122 UUIDs**: Zod v4's `.uuid()` enforces version/variant bits — all-same-char test UUIDs (e.g., `'aaaa...'`) will be rejected

### Key Lessons

1. **Run the audit before declaring done** — found 4 real breaks that would have shipped. The formal audit step catches integration issues that per-phase verification misses.
2. **Design athlete-accessible URLs upfront** — the feedback email URL went through 3 iterations because the athlete auth model on the review page wasn't considered when the email was designed.
3. **Auth link generation belongs to admin API** — any email that needs to deep-link an unauthenticated user into the app must use `generateLink()`, not static paths.
4. **Middleware PUBLIC_PATHS is high-stakes** — a one-character change (`startsWith('/')` → `=== '/'`) silently bypassed all auth for weeks; tests should cover this path specifically.
5. **Phase summaries are worth the minute they take** — Phase 02.1 missing a SUMMARY.md made it unverifiable at audit time; the cost of writing the summary is near zero vs. the cost of later uncertainty.

### Cost Observations

- Model: claude-sonnet-4-6 (balanced profile throughout)
- Sessions: ~8-10 sessions across 5 days
- Notable: Phase 2.2 (model evaluation with Gemini + YOLO11 prototype) was the highest-context session; most execution plans ran in 1-7 minutes

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Timeline | 5 days |
| Phases | 9 |
| Plans | 38 |
| Tests | 84 |
| LOC (TS) | ~6,464 |
| Audit gaps | 4 (all closed before archive) |
| Requirements | 18/18 |
