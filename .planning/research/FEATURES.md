# Features Research: Softball Mechanics Coaching App

**Domain:** Sports video coaching platforms (Hudl, Coach's Eye, Dartfish, Tempo)
**Date:** 2026-02-26

---

## Table Stakes

These are expected by coaches and athletes. Missing any of these and users leave.

### Video Management
- **Video upload** — from phone camera roll or direct record; supports portrait + landscape
- **Video playback controls** — play, pause, scrub frame-by-frame, slow motion (0.25x, 0.5x)
- **Video library** — organized by athlete, date, mechanics type (hitting/pitching)
- **Session history** — coach and athlete can both see all past submissions and feedback

### Annotation Tools
- **Drawing tools** — freehand pen, straight lines, arrows
- **Geometric tools** — angle measurement, circles, rectangles
- **Color selection** — at minimum 4-5 colors (red for problems, green for good, etc.)
- **Text overlays** — add text labels to frames
- **Frame capture** — freeze a specific frame to annotate

### Feedback Delivery
- **Coaching notes** — written text feedback attached to a session
- **Notification when feedback is ready** — email at minimum; in-app ideal
- **Athlete view** — clean interface to receive and review feedback without coach clutter

### Account & Access
- **Coach and athlete roles** — different UIs and permissions
- **Athlete roster** — coach can see and manage their athletes
- **Secure video access** — athletes only see their own videos; coaches see their roster

---

## Differentiators

These separate a softball-specific app from generic tools (Hudl, Coach's Eye).

### Softball-Specific AI Analysis
- **Pose detection overlaid on video** — skeleton overlay showing body position at any frame
- **Joint angle computation** — automatically measure hip rotation, elbow slot, shoulder tilt
- **Mechanics scoring** — flag specific issues: "early hip rotation," "dropping elbow," "inconsistent release point"
- **Hitting-specific checkpoints:** stance, load, stride, contact, follow-through
- **Pitching-specific checkpoints:** grip, drive, arm circle, release, finish

### Side-by-Side Comparison
- **Player vs. reference** — compare player's swing/pitch to a coach-uploaded reference clip
- **Synchronized scrubbing** — both videos advance frame-by-frame in sync
- **Overlay mode** — ghost overlay of reference on top of player video

### Structured Feedback Templates
- **Softball-specific feedback categories** — pre-built categories for common hitting/pitching issues
- **Drill recommendations** — link a coaching note to a specific drill
- **Progress tracking** — show improvement in specific mechanics over multiple sessions

### Session Modes
- **Async mode** — player submits, coach reviews on their time, player gets notified
- **Live mode** — coach and player review video together in real-time with shared cursor/annotations

---

## Anti-Features (Do NOT Build in v1)

| Feature | Why to Avoid |
|---------|--------------|
| **Full team management** (schedules, lineups, game stats) | Scope creep — this is a mechanics coaching tool, not a team management platform |
| **In-app video recording** | Complex permissions, edge cases; camera roll upload is sufficient for v1 |
| **Social/community features** | Not a social network; coaches don't want athletes comparing notes publicly |
| **Payments / subscriptions** | Adds legal, financial, and support complexity — validate workflow first |
| **Fielding / base running analysis** | Requires different pose models and coaching logic; hitting + pitching is enough for v1 |
| **Native mobile app** | Web-first; mobile browser handles upload + review adequately |
| **Video editing** (cuts, clips, highlights) | Not a video editor — stay focused on mechanics analysis |
| **Parent portal** | Out of scope for v1 — coach ↔ athlete is the core relationship |

---

## Feature Complexity Map

| Feature | Complexity | v1 Priority |
|---------|------------|-------------|
| Video upload + playback | Medium | Must |
| Frame-by-frame scrub | Low | Must |
| Drawing/annotation tools | Medium | Must |
| Written coaching notes | Low | Must |
| Email notification | Low | Must |
| Coach + athlete roles | Medium | Must |
| Athlete roster | Low | Must |
| MediaPipe pose overlay | High | Should |
| Joint angle measurement | High | Should |
| Side-by-side comparison | High | Should |
| Live session mode | High | Could (v1.x) |
| Mechanics scoring/flags | Very High | V2 |
| Drill recommendations | Medium | V2 |
| Progress tracking charts | Medium | V2 |
| Custom reference library | Medium | V2 |

---

## Competitive Landscape

| Tool | Gap This App Fills |
|------|-------------------|
| **Coach's Eye** | Has annotation but no softball-specific AI, no role system, generic |
| **Hudl** | Team/game focused, expensive, not mechanics-coaching workflow |
| **Dartfish** | Expensive enterprise tool, not accessible for travel coaches |
| **Tempo** | Golf-specific AI; no softball |
| **iMessage/DMs** | Zero structure, no annotation, no history, no roles |

**Unique position:** Softball-specific AI analysis + structured coach-athlete workflow at a price point travel coaches can afford.
