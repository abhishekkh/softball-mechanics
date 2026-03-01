# Phase 3: Annotation Workspace - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Coach video review workspace where coaches freeze frames, draw annotations (freehand, straight lines, arrows, angle overlays, text), pick colors, and those annotations replay in sync during scrubbing and playback. Also includes frame-by-frame stepping and slow-motion playback controls. The workspace must work on both desktop browsers and iPad/mobile with touch and stylus support.

Delivering feedback to athletes (Phase 4) and adding written coaching cues tied to timestamps (FEED-01) are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Canvas & Annotation Mode Entry
- Clicking the video/canvas while paused freezes the frame and activates drawing mode automatically — no separate "Annotate" button
- Pressing Escape or clicking outside the canvas exits annotation mode; video stays paused
- Scrubbing to a frame that already has annotations shows those annotations automatically on the canvas
- Coach can click to re-enter edit mode on any annotated frame to add, delete, or redraw — full edit (not just clear-all)

### AI Skeleton During Annotation
- AI pose skeleton overlay (from Phase 2) stays visible by default while in annotation mode
- Coach can toggle the skeleton off if they want a clean canvas

### Annotation Tool UI
- Floating toolbar appears beside/above the canvas only when in annotation mode — hidden during normal playback/scrubbing
- Toolbar holds: freehand, straight line, arrow, angle measurement, text, color picker, clear frame
- Undo/redo: Cmd+Z / Ctrl+Z to undo; Cmd+Shift+Z / Ctrl+Shift+Z to redo
- Color choices: red, green, yellow, white (minimum per ANN-04; Claude can add more if clean)

### Angle Measurement Tool (ANN-02)
- Three-point click interaction: coach clicks the vertex/apex point, then clicks two arm endpoints; angle value label appears automatically
- Not snapped to AI joints — freeform placement

### Annotation Scope & Storage
- Annotations are tied to a single frame timestamp (not a frame range) — simplest correct model for v1
- Stored in Supabase in a new table as time-indexed JSON per video per frame timestamp
- Loaded when the review workspace opens; consistent with Phase 1 & 2 data patterns

### Timeline Indicators
- Annotated frames show a colored marker/dot on the timeline scrubber (same visual pattern as Phase 2 AI-flagged frame markers)

### Playback with Annotations
- During video playback, annotations overlay in sync — video does NOT auto-pause at annotated frames
- Coach uses 0.25x / 0.5x slow motion to see annotations clearly while playing

### Frame-by-Frame Controls (Desktop)
- Arrow keys (left/right) step frame-by-frame when video is paused
- Speed controls (0.25x, 0.5x, 1x) live in the video player bar, always visible

### Frame-by-Frame Controls (iPad/Mobile Touch)
- Swipe left/right on the paused video to step frames (gesture-native, no extra buttons needed)
- Drawing canvas supports both finger touch and Apple Pencil / stylus (pointer events API — no special config)
- Annotation toolbar appears only in annotation mode (slides/fades in on freeze)
- Speed controls stay in the player bar
- In annotation mode: one finger draws; two-finger pinch zooms canvas; two-finger drag pans canvas

### Claude's Discretion
- Exact floating toolbar visual design and positioning (top-left, top-right, etc.)
- Stroke width defaults and options
- Canvas zoom/pan reset behavior when exiting annotation mode
- Error handling for failed annotation saves (retry, toast, etc.)
- Exact color palette beyond the required four

</decisions>

<specifics>
## Specific Ideas

- Works on both desktop browsers and iPad/mobile — responsive and touch-first in annotation mode
- Apple Pencil / stylus support via pointer events API
- Timeline marker dots for annotated frames should visually match the Phase 2 AI-flagged frame marker pattern for consistency

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-annotation-workspace*
*Context gathered: 2026-02-28*
