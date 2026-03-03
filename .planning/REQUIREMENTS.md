# Requirements: Softball Mechanics Coaching App

**Defined:** 2026-02-26
**Core Value:** Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Coach can create an account with email and password
- [ ] **AUTH-02**: Coach can log in and stay logged in across browser sessions
- [x] **AUTH-03**: Coach can invite an athlete via a shareable link (no full account required for athlete)
- [ ] **AUTH-04**: Athlete can access their submissions and feedback via invite link / magic link

### Video

- [ ] **VID-01**: Coach or athlete can upload a video from their camera roll (phone or desktop)
- [x] **VID-02**: Uploaded video is transcoded to HLS for smooth streaming playback

### AI Analysis

- [x] **AI-01**: Pose skeleton overlay is rendered on video frames using MediaPipe body landmarks
- [x] **AI-02**: Joint angles are automatically computed (hip rotation, elbow slot, shoulder tilt)
- [x] **AI-03**: AI flags potential mechanics issues (e.g., "dropping elbow," "early hip rotation") with confidence score

### Email Delivery (Phase 02.4)

- [x] **EMAIL-INVITE-01**: Coach invites an athlete and the athlete receives a branded Resend invite email (in addition to the Supabase auth email) with a link to access the app
- [x] **EMAIL-FEEDBACK-01**: Coach can send a mechanics feedback summary email to the athlete directly from the review page, containing the VLM/Gemini analysis summary and a link to /submissions

### Roster & Session Management

- [x] **ROST-01**: Coach can view their athlete roster
- [x] **ROST-02**: Coach can invite an athlete to their roster via a shareable link

## v2 Requirements

### Annotation and Feedback Delivery (Phase 3 — v2)

- [ ] **VID-03**: User can scrub through video frame-by-frame
- [ ] **VID-04**: User can play video at slow motion speeds (0.25x, 0.5x)
- [ ] **ANN-01**: Coach can freeze a video frame and draw on it (freehand, straight lines, arrows)
- [ ] **ANN-02**: Coach can place an angle measurement overlay on a frozen frame
- [ ] **ANN-03**: Coach can add text labels to a frozen frame
- [ ] **ANN-04**: Coach can select annotation color (minimum: red, green, yellow, white)
- [ ] **ANN-05**: Annotations are saved as time-indexed JSON and replay in sync with video
- [ ] **FEED-01**: Coach can add written coaching cues tied to specific timestamps in the video
- [ ] **FEED-02**: Athlete can view their feedback package (annotations + coaching cues) in their inbox
- [ ] **FEED-03**: Coach can load a reference video and compare it side-by-side with the athlete's video, with synchronized scrubbing
- [ ] **ROST-03**: Coach can view session history for a specific athlete

### Notifications

- **NOTF-01**: Athlete receives email notification when feedback is ready
- **NOTF-02**: Coach receives email notification when a new athlete submission arrives
- **NOTF-03**: In-app notification center for both roles

### Live Sessions

- **LIVE-01**: Coach and athlete can join a live session room to review video together in real-time
- **LIVE-02**: Annotations made during live session are shared in real-time (shared cursor/canvas)
- **LIVE-03**: Live session drawings saved to async feedback package

### Progress Tracking

- **PROG-01**: Athlete can view improvement in flagged mechanics across multiple sessions
- **PROG-02**: Coach can see a trend chart of specific joint angles over time per athlete

### Advanced AI

- **AI-04**: AI-generated mechanics scoring per session (composite score per checkpoint)
- **AI-05**: Drill recommendations linked to specific flagged mechanics issues

### Branding and Marketing (Phase 5)

- [x] **BRAND-01**: App renamed "Diamond Mechanics" everywhere — all user-facing UI text, email copy, page titles, and consent strings updated; "Softball Mechanics" removed from all user-facing surfaces
- [x] **BRAND-02**: Diamond blue brand color (oklch ≈ #2563eb) applied to --primary, --ring, and --sidebar-primary tokens in globals.css so it cascades to all shadcn buttons, focus rings, and interactive elements
- [x] **BRAND-03**: Public landing page at root URL with hero (app name + tagline + "Start free" CTA), 3-4 feature highlights, and 3-step how-it-works section; copy is warm, community-focused, and addresses both baseball and softball coaches; no pricing, testimonials, demo video, or email capture
- [x] **BRAND-04**: App shell nav and auth pages (login, signup) show Diamond Mechanics logo/wordmark; invite acceptance pages (/invite/accept, /invite/[token]) display brand name above status content
- [x] **BRAND-05**: Per-page `<title>` + `<description>` metadata on all app routes (dashboard, upload, review, roster, submissions); favicon replaced with Diamond Mechanics brand mark (icon.svg); static OG image (opengraph-image.png) for landing page social sharing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payments / subscriptions | Validate coaching workflow before adding billing complexity |
| Native mobile app | Web-first; mobile browser sufficient for v1 |
| Fielding / base running analysis | Different pose models needed; hitting + pitching is v1 scope |
| Full team management (schedules, lineups, game stats) | Out of domain — this is a mechanics coaching tool |
| Social / community features | Not a social network |
| In-app video recording | Camera roll upload sufficient; in-app recording adds permission complexity |
| Parent portal | Coach ↔ athlete is the core relationship for v1 |
| Video editing (cuts, highlights, exports) | Not a video editor |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 06 (gap closure) | Pending |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 06 (gap closure) | Pending |
| VID-01 | Phase 06 (gap closure) | Pending |
| VID-02 | Phase 1 | Complete |
| ROST-01 | Phase 1 | Complete |
| ROST-02 | Phase 1 | Complete |
| AI-01 | Phase 2 | Complete (verified 2026-02-28 — 02-06) |
| AI-02 | Phase 2 | Complete (verified 2026-02-28 — 02-06) |
| AI-03 | Phase 2 | Complete (verified 2026-02-28 — 02-06) |
| EMAIL-INVITE-01 | Phase 06 (gap closure) | Complete |
| EMAIL-FEEDBACK-01 | Phase 06 (gap closure) | Complete |
| VID-03 | Phase 3 (v2) | Deferred |
| VID-04 | Phase 3 (v2) | Deferred |
| ANN-01 | Phase 3 (v2) | Deferred |
| ANN-02 | Phase 3 (v2) | Deferred |
| ANN-03 | Phase 3 (v2) | Deferred |
| ANN-04 | Phase 3 (v2) | Deferred |
| ANN-05 | Phase 3 (v2) | Deferred |
| FEED-01 | Phase 3 (v2) | Deferred |
| FEED-02 | Phase 3 (v2) | Deferred |
| FEED-03 | Phase 3 (v2) | Deferred |
| ROST-03 | Phase 3 (v2) | Deferred |
| BRAND-01 | Phase 5 | Complete |
| BRAND-02 | Phase 5 | Complete |
| BRAND-03 | Phase 5 | Complete |
| BRAND-04 | Phase 5 | Complete |
| BRAND-05 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 18 (11 deferred to v2 — VID-03/04, ANN-01–05, FEED-01–03, ROST-03)
- Mapped to phases: 18
- Unmapped: 0
- v2 deferred from v1.0: 11 (Phase 3 — Annotation and Feedback Delivery)

Phase breakdown (v1):
- Phase 1 (Foundation): AUTH-01, AUTH-02, AUTH-03, AUTH-04, VID-01, VID-02, ROST-01, ROST-02 — 8 requirements
- Phase 2 (AI Pose Analysis): AI-01, AI-02, AI-03 — 3 requirements
- Phase 02.4 (Email Invite + Feedback): EMAIL-INVITE-01, EMAIL-FEEDBACK-01 — 2 requirements (gap-closed by Phase 06)
- Phase 5 (Branding and Marketing): BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05 — 5 requirements
- Phase 06 (v1.0 Integration Bug Fixes): AUTH-02, AUTH-04, VID-01, EMAIL-INVITE-01, EMAIL-FEEDBACK-01 — 5 gap closure requirements

Phase breakdown (v2):
- Phase 3 (Annotation Workspace and Feedback Delivery): VID-03, VID-04, ANN-01, ANN-02, ANN-03, ANN-04, ANN-05, FEED-01, FEED-02, FEED-03, ROST-03 — 11 requirements

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-03-03 — Phase 06 added to close 5 partial v1 requirements (AUTH-02, AUTH-04, VID-01, EMAIL-INVITE-01, EMAIL-FEEDBACK-01) found by v1.0 audit; 13/18 complete, 5 pending gap closure*
