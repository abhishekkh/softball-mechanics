# Requirements: Softball Mechanics Coaching App

**Defined:** 2026-02-26
**Core Value:** Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: Coach can create an account with email and password
- [ ] **AUTH-02**: Coach can log in and stay logged in across browser sessions
- [ ] **AUTH-03**: Coach can invite an athlete via a shareable link (no full account required for athlete)
- [ ] **AUTH-04**: Athlete can access their submissions and feedback via invite link / magic link

### Video

- [ ] **VID-01**: Coach or athlete can upload a video from their camera roll (phone or desktop)
- [ ] **VID-02**: Uploaded video is transcoded to HLS for smooth streaming playback
- [ ] **VID-03**: User can scrub through video frame-by-frame
- [ ] **VID-04**: User can play video at slow motion speeds (0.25x, 0.5x)

### Annotation

- [ ] **ANN-01**: Coach can freeze a video frame and draw on it (freehand, straight lines, arrows)
- [ ] **ANN-02**: Coach can place an angle measurement overlay on a frozen frame
- [ ] **ANN-03**: Coach can add text labels to a frozen frame
- [ ] **ANN-04**: Coach can select annotation color (minimum: red, green, yellow, white)
- [ ] **ANN-05**: Annotations are saved as time-indexed JSON and replay in sync with video

### AI Analysis

- [ ] **AI-01**: Pose skeleton overlay is rendered on video frames using MediaPipe body landmarks
- [ ] **AI-02**: Joint angles are automatically computed (hip rotation, elbow slot, shoulder tilt)
- [ ] **AI-03**: AI flags potential mechanics issues (e.g., "dropping elbow," "early hip rotation") with confidence score

### Feedback

- [ ] **FEED-01**: Coach can add written coaching cues tied to specific timestamps in the video
- [ ] **FEED-02**: Athlete can view their feedback package (annotations + coaching cues) in their inbox
- [ ] **FEED-03**: Coach can load a reference video and compare it side-by-side with the athlete's video, with synchronized scrubbing

### Roster & Session Management

- [ ] **ROST-01**: Coach can view their athlete roster
- [ ] **ROST-02**: Coach can invite an athlete to their roster via a shareable link
- [ ] **ROST-03**: Coach can view session history for a specific athlete

## v2 Requirements

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
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| VID-01 | Phase 1 | Pending |
| VID-02 | Phase 1 | Pending |
| ROST-01 | Phase 1 | Pending |
| ROST-02 | Phase 1 | Pending |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 2 | Pending |
| AI-03 | Phase 2 | Pending |
| VID-03 | Phase 3 | Pending |
| VID-04 | Phase 3 | Pending |
| ANN-01 | Phase 3 | Pending |
| ANN-02 | Phase 3 | Pending |
| ANN-03 | Phase 3 | Pending |
| ANN-04 | Phase 3 | Pending |
| ANN-05 | Phase 3 | Pending |
| FEED-01 | Phase 4 | Pending |
| FEED-02 | Phase 4 | Pending |
| FEED-03 | Phase 4 | Pending |
| ROST-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

Phase breakdown:
- Phase 1 (Foundation): AUTH-01, AUTH-02, AUTH-03, AUTH-04, VID-01, VID-02, ROST-01, ROST-02 — 8 requirements
- Phase 2 (AI Pose Analysis): AI-01, AI-02, AI-03 — 3 requirements
- Phase 3 (Annotation Workspace): VID-03, VID-04, ANN-01, ANN-02, ANN-03, ANN-04, ANN-05 — 7 requirements
- Phase 4 (Feedback Delivery): FEED-01, FEED-02, FEED-03, ROST-03 — 4 requirements

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — phase order revised: AI Pose Analysis moved to Phase 2, Annotation Workspace moved to Phase 3*
