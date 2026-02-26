# Softball Mechanics Coaching App

## What This Is

A video-based softball mechanics coaching platform for travel and competitive athletes. Coaches and players upload hitting and pitching videos; AI automatically flags mechanical issues, and coaches review, annotate, and deliver structured feedback — enabling remote coaching between sessions.

## Core Value

Coaches can give high-quality, specific mechanical feedback to players remotely — not just in-person.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Player can upload hitting or pitching video for review
- [ ] AI auto-detects body mechanics and flags issues (pose detection)
- [ ] Coach can annotate video (draw, add markers, timestamp notes)
- [ ] Coach can add written coaching cues to a session
- [ ] Side-by-side comparison view (player vs. ideal/pro form)
- [ ] Player receives completed feedback package from coach
- [ ] Both async (player submits → coach reviews later) and live session modes
- [ ] Coaches and players have separate account roles

### Out of Scope

- Payments / billing — not in v1, focus on the coaching workflow first
- Fielding or base running mechanics — v1 is hitting and pitching only
- Team/roster management — v1 is coach-player pairs, not full team management

## Context

- Target users: travel/competitive softball coaches and their players
- Current reality: coaches can only give feedback in-person; no good remote workflow exists
- Coaches today share clips via iMessage/DMs with no structure or threading
- Existing tools (Hudl, Coach's Eye) are not softball-specific and lack softball AI analysis
- v1 goal: put a working core workflow in front of real coaches to validate

## Constraints

- **Scope**: v1 is the core upload → analyze → annotate → deliver loop; no payments or team management
- **Sport specificity**: AI analysis should be softball-specific (pitching = windmill, hitting = softball stance/swing)
- **Platform**: TBD — web-first or mobile-first to be decided during planning

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hitting + pitching only (v1) | Broadest impact, most requested coaching areas | — Pending |
| AI + coach hybrid analysis | AI surfaces issues fast; coach adds nuance and context | — Pending |
| Both async and live modes | Remote between sessions AND in-person use cases | — Pending |

---
*Last updated: 2026-02-26 after initialization*
