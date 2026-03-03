# Phase 2: AI Pose Analysis - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatically extract softball-specific pose data from uploaded videos so coaches can see a skeleton overlay, joint angles, and AI-flagged mechanics issues on any frame in the review workspace. Annotation tools, benchmark comparison, and athlete feedback delivery are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Analysis Trigger
- Analysis runs automatically after video upload completes (triggered as part of the post-upload pipeline)
- Status indicator shown in the review workspace while analysis is in progress (e.g., "Analyzing… 60%")
- On failure or low confidence: show partial results with a warning — do not hide data
- Re-uploads keep prior analysis; coach can manually trigger re-analysis via a "Re-analyze" button
- Upload page includes framing guidance tips (e.g., "Film from the side so hands and bat path are visible")
- Post-analysis validates video framing quality; if suboptimal (not side-on, hands obscured), shows a warning to the coach in the review workspace

### Skeleton Overlay Style
- Full body — all major joints: shoulders, elbows, wrists, hips, knees, ankles, feet
- Color-coded by mechanics zone (e.g., one color for hips/lower body, another for arms/upper body, red for flagged joints)
- Toggle-able: on by default, coach can hide it for clean video viewing
- Updates live on every frame as coach scrubs through the video

### Joint Angle Display
- Sidebar panel alongside the video (not on-frame labels)
- Displays the three softball mechanics angles: hip rotation, elbow slot, shoulder tilt
- Each angle shows the measured value alongside the ideal range sourced from softball biomechanics research (e.g., "Hip Rotation: 87° — ideal: 80–100°")
- Sidebar values update live as coach scrubs through frames

### AI Flagging UX
- Color-coded markers on the video scrubber timeline at flagged frame positions
- When coach is on a flagged frame: sidebar shows issue label + AI confidence score (e.g., "Elbow Drop — 87% confidence")
- Prev/next flag navigation buttons in the sidebar, in addition to clicking timeline markers directly

### Claude's Discretion
- Exact color scheme for mechanics zones
- Specific biomechanics research source for ideal angle ranges
- Confidence score threshold for what constitutes a "flag" (vs. low-confidence noise)
- Framing validation implementation (model-based or heuristic)
- Exact progress indicator design

</decisions>

<specifics>
## Specific Ideas

- Video framing requirement: side-on view where hands and bat path are visible — this is necessary for accurate elbow slot and wrist tracking
- The review workspace sidebar consolidates skeleton toggle, joint angles, and flagging info in one place

</specifics>

<deferred>
## Deferred Ideas

- Benchmark comparison: re-run analysis against a reference/benchmark player and diff pose data — significant capability, its own phase
- Coach-configurable target angle ranges — could be added in Phase 3 or later once coach workflow is established

</deferred>

---

*Phase: 02-ai-pose-analysis*
*Context gathered: 2026-02-27*
