# Phase 3: Annotation Workspace - Research

**Researched:** 2026-02-28
**Domain:** Canvas annotation, video playback control, Supabase JSON storage, touch/pointer events
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canvas & Annotation Mode Entry**
- Clicking the video/canvas while paused freezes the frame and activates drawing mode automatically — no separate "Annotate" button
- Pressing Escape or clicking outside the canvas exits annotation mode; video stays paused
- Scrubbing to a frame that already has annotations shows those annotations automatically on the canvas
- Coach can click to re-enter edit mode on any annotated frame to add, delete, or redraw — full edit (not just clear-all)

**AI Skeleton During Annotation**
- AI pose skeleton overlay (from Phase 2) stays visible by default while in annotation mode
- Coach can toggle the skeleton off if they want a clean canvas

**Annotation Tool UI**
- Floating toolbar appears beside/above the canvas only when in annotation mode — hidden during normal playback/scrubbing
- Toolbar holds: freehand, straight line, arrow, angle measurement, text, color picker, clear frame
- Undo/redo: Cmd+Z / Ctrl+Z to undo; Cmd+Shift+Z / Ctrl+Shift+Z to redo
- Color choices: red, green, yellow, white (minimum per ANN-04; Claude can add more if clean)

**Angle Measurement Tool (ANN-02)**
- Three-point click interaction: coach clicks the vertex/apex point, then clicks two arm endpoints; angle value label appears automatically
- Not snapped to AI joints — freeform placement

**Annotation Scope & Storage**
- Annotations are tied to a single frame timestamp (not a frame range) — simplest correct model for v1
- Stored in Supabase in a new table as time-indexed JSON per video per frame timestamp
- Loaded when the review workspace opens; consistent with Phase 1 & 2 data patterns

**Timeline Indicators**
- Annotated frames show a colored marker/dot on the timeline scrubber (same visual pattern as Phase 2 AI-flagged frame markers)

**Playback with Annotations**
- During video playback, annotations overlay in sync — video does NOT auto-pause at annotated frames
- Coach uses 0.25x / 0.5x slow motion to see annotations clearly while playing

**Frame-by-Frame Controls (Desktop)**
- Arrow keys (left/right) step frame-by-frame when video is paused
- Speed controls (0.25x, 0.5x, 1x) live in the video player bar, always visible

**Frame-by-Frame Controls (iPad/Mobile Touch)**
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

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VID-03 | User can scrub through video frame-by-frame | `video.currentTime += 1/frameRate` on arrow key / swipe; `requestVideoFrameCallback` for sync; frame step size ~0.033s (30fps) or 0.04s (25fps) |
| VID-04 | User can play video at slow motion speeds (0.25x, 0.5x) | `video.playbackRate = 0.25 / 0.5` — native HTML5 API, works with HLS.js; speed buttons in player bar |
| ANN-01 | Coach can freeze a frame and draw on it (freehand, straight lines, arrows) | react-konva Stage/Layer: Konva.Line (freehand + tension=0), Konva.Arrow; click-to-freeze pattern; pointer events for touch/stylus |
| ANN-02 | Coach can place an angle measurement overlay on a frozen frame | Three-point click state machine; compute angle with Math.atan2; render Konva.Arc + Konva.Text label; no snap to joints |
| ANN-03 | Coach can add text labels to a frozen frame | Konva.Text + click-to-place in text tool mode; no external editor library needed |
| ANN-04 | Coach can select annotation color (minimum: red, green, yellow, white) | Color stored in tool state; passed as `stroke` prop to each Konva shape; color picker buttons in floating toolbar |
| ANN-05 | Annotations are saved as time-indexed JSON and replay in sync with video | New `video_annotations` table in Supabase: one row per (video_id, frame_timestamp_ms); shapes stored as JSONB array; loaded on workspace open; rendered on `timeupdate` / scrub |
</phase_requirements>

---

## Summary

Phase 3 builds a canvas annotation layer on top of the existing Phase 2 review workspace (`ReviewPageClient`, `VideoWithOverlay`, `AnalysisTimeline`). The core technical challenge is coordinating three overlapping concerns: (1) video playback control (frame stepping, slow motion), (2) a vector annotation canvas that freezes on top of the video and syncs during playback/scrub, and (3) persistent time-indexed storage and retrieval of annotation shapes.

The confirmed standard approach for this use case is **react-konva** (Konva v9 + react-konva v19 for React 19). Konva provides all required shape primitives — Line, Arrow, Arc, Text — as declarative React components with built-in pointer and touch event support. This avoids hand-rolling hit detection, object selection, and multi-touch pan/zoom. The existing Phase 2 canvas (`VideoWithOverlay`) uses a raw imperative canvas for the skeleton overlay; the annotation layer will be a second canvas (Konva Stage) stacked absolutely on top. Keeping them separate prevents annotation repaints from clearing the skeleton and vice versa.

Frame-by-frame stepping uses the standard `video.currentTime += frameDuration` pattern. The frame duration is best estimated at 1/30s (for 30fps source) and confirmed via `requestVideoFrameCallback` metadata on first playback. Slow motion is `video.playbackRate = 0.25 / 0.5` — native HTML5, fully HLS.js compatible. Annotation replay during playback uses the existing `timeupdate` event pattern already in `VideoWithOverlay`, extended to look up and render the annotation layer for the current frame.

**Primary recommendation:** Use react-konva v19 for the annotation canvas layer. Store annotations as JSONB arrays in a new `video_annotations` Supabase table keyed by `(video_id, frame_timestamp_ms)`. Extend the existing `VideoWithOverlay` component to accept and render annotations, or compose a new `AnnotationCanvas` overlay alongside it.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| konva | ^9.x | Canvas 2D engine: shapes, events, hit detection, layers | TypeScript-native, highest performance dirty-region rendering, multi-touch built-in |
| react-konva | ^19.x | React bindings for Konva | Official React 19 support (react-konva v19.x matches React 19); declarative JSX for all Konva shapes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | Video playback control, speed, frame stepping | Native HTML5 `playbackRate` + `currentTime` APIs; already handled by existing HLS player |
| @supabase/supabase-js | ^2.x | Annotation persistence | Already installed; new table + RLS patterns identical to Phase 2 |
| lucide-react | ^0.575 | Toolbar icon buttons | Already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-konva | Fabric.js v6 | Fabric v6 rewrote API in breaking ways; React wrapper (fabricjs-react) is community-maintained and lags; Fabric is stronger for image manipulation but weaker for declarative React patterns. Konva is more React-idiomatic. |
| react-konva | Raw Canvas 2D API (imperative) | Must hand-roll hit detection, object selection, undo/redo, multi-touch. No benefit for this scope. Use raw canvas only for the skeleton overlay (already done in Phase 2) since it's not interactive. |
| Konva Stage on second canvas | Single canvas for everything | Mixing imperative skeleton draws with declarative annotation shapes in one canvas causes timing conflicts and forces full redraws on every annotation change. Two separate canvases is the clean solution. |

**Installation:**
```bash
npm install konva react-konva
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── review/
│       ├── ReviewPageClient.tsx          # existing — extend with annotation state
│       ├── VideoWithOverlay.tsx          # existing — keep skeleton canvas; expose freeze/seek API
│       ├── AnnotationCanvas.tsx          # NEW — react-konva Stage; handles all drawing tools
│       ├── AnnotationToolbar.tsx         # NEW — floating tool/color picker (shown in annotation mode only)
│       ├── AnalysisTimeline.tsx          # existing — extend with annotation frame markers (same dot pattern)
│       └── MechanicsSidebar.tsx          # existing — no Phase 3 changes
├── hooks/
│   ├── usePoseAnalysis.ts                # existing — unchanged
│   └── useAnnotations.ts                 # NEW — load/save/sync annotations from Supabase
├── types/
│   ├── analysis.ts                       # existing — unchanged
│   └── annotation.ts                     # NEW — AnnotationFrame, AnnotationShape union type
├── lib/
│   └── annotation/
│       └── geometry.ts                   # NEW — computeAngle(v, p1, p2) pure function
└── app/
    └── api/
        └── annotations/
            └── route.ts                  # NEW — GET/POST /api/annotations?videoId=...
```

---

### Pattern 1: Two-Canvas Stacking (Skeleton + Annotation)

**What:** The existing `VideoWithOverlay` component already renders a raw canvas absolutely positioned over the video for the skeleton. The annotation canvas (react-konva Stage) is a third absolutely-positioned element in the same container, rendered above the skeleton canvas.

**When to use:** Any time interactive annotations must coexist with a non-interactive imperative overlay.

**Example:**
```tsx
// src/components/review/VideoWithOverlay.tsx (simplified structure)
// The container holds three layers in z-order:
<div className="relative inline-block w-full">
  <video ref={videoRef} className="w-full block" controls playsInline />
  {/* Layer 1: Skeleton overlay (raw canvas, pointer-events: none) */}
  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
  {/* Layer 2: Annotation canvas (react-konva Stage, pointer-events: auto in annotation mode) */}
  <AnnotationCanvas
    isAnnotationMode={isAnnotationMode}
    annotations={currentFrameAnnotations}
    onSave={handleSaveAnnotations}
  />
</div>
```

**Key insight:** `pointer-events: none` on the skeleton canvas lets mouse/touch events pass through to the annotation canvas below. In playback mode, `pointer-events: none` on the annotation canvas too, so the native video controls remain accessible.

---

### Pattern 2: Frame-by-Frame Stepping

**What:** Arrow keys (desktop) or swipe gesture (mobile) increment/decrement `video.currentTime` by one frame duration.

**When to use:** VID-03. When video is paused.

**Example:**
```typescript
// Frame step size: approximate for common frame rates
// HLS transcoded output from Phase 1 Inngest worker — check actual FPS via video.getVideoPlaybackQuality() or assume 30fps
const FRAME_STEP_SEC = 1 / 30; // 0.0333s — adjust if source is 25fps

function stepFrame(video: HTMLVideoElement, direction: 'prev' | 'next') {
  if (video.paused) {
    video.currentTime = Math.max(0,
      Math.min(video.duration, video.currentTime + (direction === 'next' ? FRAME_STEP_SEC : -FRAME_STEP_SEC))
    );
  }
}

// Keyboard: attach to document in useEffect, remove on cleanup
// Swipe: use pointer events on the video container — track pointerdown X, pointerup X delta
```

**Caveat:** HTML5 video `currentTime` is not frame-accurate for all codecs. For HLS streams, seeking by 1/30s is a "best effort" approach — it works well in practice for coaching review (approximate frame is sufficient). True frame-accurate seeking would require `requestVideoFrameCallback` loops, which add significant complexity without meaningful coaching benefit.

---

### Pattern 3: Slow Motion Playback

**What:** `video.playbackRate` property — native HTML5, no library required, fully compatible with HLS.js.

**When to use:** VID-04.

**Example:**
```typescript
// Speed buttons in player bar — always visible
const SPEEDS = [0.25, 0.5, 1.0];

function setPlaybackSpeed(video: HTMLVideoElement, rate: number) {
  video.playbackRate = rate;
}

// Most browsers support 0.0625x–16x; 0.25x is universally supported
// HLS.js does not interfere with playbackRate — confirmed by HLS.js documentation
```

---

### Pattern 4: Annotation Mode State Machine

**What:** A React state machine in `ReviewPageClient` controls the annotation lifecycle.

**States:** `'playback' | 'annotating'`

**Transitions:**
- `playback` → `annotating`: Video paused + user clicks canvas
- `annotating` → `playback`: Escape key OR click outside canvas
- Both states: Video stays paused when entering annotation mode; user can resume playback from either state

**Example:**
```typescript
type WorkspaceMode = 'playback' | 'annotating';

const [mode, setMode] = useState<WorkspaceMode>('playback');
const [frozenTimestampMs, setFrozenTimestampMs] = useState<number | null>(null);

function handleVideoCanvasClick() {
  if (!video.paused) {
    video.pause();
  }
  setFrozenTimestampMs(Math.round(video.currentTime * 1000));
  setMode('annotating');
}

// On scrub: if the new timestamp has saved annotations, load them and enter annotating mode
// so they display. Video stays paused during manual scrub already.
```

---

### Pattern 5: Annotation Shape Types

**What:** A discriminated union type for all annotation shapes. Each shape is self-contained with enough data to re-render without the canvas object model.

**Example:**
```typescript
// src/types/annotation.ts

export type AnnotationToolType = 'freehand' | 'line' | 'arrow' | 'angle' | 'text';

export type AnnotationColor = 'red' | 'green' | 'yellow' | 'white' | string; // extras via discretion

export interface FreehandShape {
  type: 'freehand';
  id: string;
  points: number[];   // flat [x1,y1,x2,y2,...] normalized 0–1
  color: AnnotationColor;
  strokeWidth: number;
}

export interface LineShape {
  type: 'line';
  id: string;
  points: [number, number, number, number]; // [x1,y1,x2,y2] normalized 0–1
  color: AnnotationColor;
  strokeWidth: number;
}

export interface ArrowShape {
  type: 'arrow';
  id: string;
  points: [number, number, number, number]; // [x1,y1,x2,y2] normalized 0–1
  color: AnnotationColor;
  strokeWidth: number;
}

export interface AngleShape {
  type: 'angle';
  id: string;
  vertex: [number, number]; // normalized 0–1
  arm1: [number, number];
  arm2: [number, number];
  angleDeg: number;         // computed; stored for display
  color: AnnotationColor;
}

export interface TextShape {
  type: 'text';
  id: string;
  position: [number, number]; // normalized 0–1
  text: string;
  color: AnnotationColor;
  fontSize: number;
}

export type AnnotationShape = FreehandShape | LineShape | ArrowShape | AngleShape | TextShape;

export interface AnnotationFrame {
  videoId: string;
  frameTimestampMs: number;
  shapes: AnnotationShape[];
}
```

**Why normalized coordinates (0–1):** Canvas display size varies by screen. Storing absolute pixel coordinates breaks replay on different screen sizes. Multiply by current canvas width/height on render.

---

### Pattern 6: react-konva Free Drawing

**What:** Standard react-konva pattern for freehand drawing using pointer events.

**Example:**
```tsx
// Source: https://konvajs.org/docs/react/Free_Drawing.html
import { Stage, Layer, Line } from 'react-konva';

// In annotation mode, pointer type is detected automatically:
// e.pointerId identifies mouse vs touch vs stylus — no special config needed
// Apple Pencil sends pointerType: 'pen' — handled identically to mouse

function AnnotationCanvas({ width, height, onShapesChange }: Props) {
  const isDrawing = useRef(false);
  const [lines, setLines] = useState<FreehandShape[]>([]);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    isDrawing.current = true;
    const pos = e.target.getStage()!.getPointerPosition()!;
    setLines(prev => [...prev, {
      type: 'freehand',
      id: crypto.randomUUID(),
      points: [pos.x / width, pos.y / height],
      color: currentColor,
      strokeWidth: 3,
    }]);
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawing.current) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    setLines(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = {
        ...last,
        points: [...last.points, pos.x / width, pos.y / height],
      };
      return updated;
    });
  };

  return (
    <Stage width={width} height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => { isDrawing.current = false; }}>
      <Layer>
        {lines.map(line => (
          <Line
            key={line.id}
            points={line.points.map((v, i) => i % 2 === 0 ? v * width : v * height)}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
          />
        ))}
      </Layer>
    </Stage>
  );
}
```

---

### Pattern 7: Angle Measurement (Three-Point Click)

**What:** State machine inside the angle tool: vertex → arm1 → arm2 → done.

**Example:**
```typescript
// src/lib/annotation/geometry.ts
export function computeAngleDeg(
  vertex: [number, number],
  arm1: [number, number],
  arm2: [number, number]
): number {
  const v1 = [arm1[0] - vertex[0], arm1[1] - vertex[1]];
  const v2 = [arm2[0] - vertex[0], arm2[1] - vertex[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
  const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;
  return Math.round(Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI));
}

// In AnnotationCanvas, when tool === 'angle':
// clickCount=0 → set vertex; clickCount=1 → set arm1; clickCount=2 → set arm2, finalize shape, reset
// Render Arc with innerRadius=0, outerRadius=30 at vertex, angle from Math.atan2 spread
// Render Konva.Text label beside arc showing angleDeg + '°'
```

---

### Pattern 8: Undo/Redo with ref-based history

**What:** Ref array + index pointer — avoids re-render on history push; only re-renders on undo/redo.

```typescript
// Source: https://konvajs.org/docs/react/Undo-Redo.html (adapted pattern)
const history = useRef<AnnotationShape[][]>([[]]); // array of shapes-arrays
const historyStep = useRef(0);

function pushHistory(newShapes: AnnotationShape[]) {
  // Truncate any future states (branching)
  history.current = history.current.slice(0, historyStep.current + 1);
  history.current.push(newShapes);
  historyStep.current = history.current.length - 1;
}

function undo() {
  if (historyStep.current === 0) return;
  historyStep.current -= 1;
  setShapes(history.current[historyStep.current]);
}

function redo() {
  if (historyStep.current >= history.current.length - 1) return;
  historyStep.current += 1;
  setShapes(history.current[historyStep.current]);
}

// Keyboard: useEffect attaches keydown to window; checks e.metaKey||e.ctrlKey + e.key==='z'
```

---

### Pattern 9: Two-Finger Pan/Zoom (iPad)

**What:** Konva's documented multi-touch pattern using `touchmove` with two touch points.

```typescript
// Source: https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html
// Set at Stage initialization:
Konva.hitOnDragEnabled = true; // enables touchmove during drag

// In onTouchMove on Stage:
// if e.evt.touches.length === 2:
//   stop Konva drag, compute pinch scale and center delta, apply to stage.scaleX/Y and position
// if e.evt.touches.length === 1:
//   resume single-finger drawing
```

---

### Pattern 10: Annotation Persistence Schema

**What:** New Supabase table `video_annotations`. One row per (video_id, frame_timestamp_ms). Shapes stored as JSONB array.

```sql
-- Migration 006
CREATE TABLE video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  frame_timestamp_ms INTEGER NOT NULL,
  shapes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, frame_timestamp_ms)
);

CREATE INDEX idx_va_video_id ON video_annotations(video_id);
CREATE INDEX idx_va_video_ts ON video_annotations(video_id, frame_timestamp_ms);

ALTER TABLE video_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read own video annotations"
  ON video_annotations FOR SELECT
  USING (video_id IN (SELECT id FROM videos WHERE coach_id = auth.uid()));

CREATE POLICY "Coaches can insert own video annotations"
  ON video_annotations FOR INSERT
  WITH CHECK (video_id IN (SELECT id FROM videos WHERE coach_id = auth.uid()));

CREATE POLICY "Coaches can update own video annotations"
  ON video_annotations FOR UPDATE
  USING (video_id IN (SELECT id FROM videos WHERE coach_id = auth.uid()));

CREATE POLICY "Coaches can delete own video annotations"
  ON video_annotations FOR DELETE
  USING (video_id IN (SELECT id FROM videos WHERE coach_id = auth.uid()));
```

**API route pattern:** `GET /api/annotations?videoId=X` → returns all rows for that video (shapes keyed by frame_timestamp_ms). `PUT /api/annotations` → upsert one frame's shapes. Use Supabase `upsert` with `onConflict: 'video_id,frame_timestamp_ms'`.

---

### Pattern 11: Annotation Replay Sync

**What:** During video playback or scrubbing, look up annotations for the current frame and render them on the annotation canvas — same approach as Phase 2 skeleton overlay.

```typescript
// useAnnotations hook loads all annotation frames for the video on mount
// Returns: annotationsMap: Map<frameTimestampMs, AnnotationShape[]>

// In VideoWithOverlay timeupdate handler (or AnnotationCanvas timeupdate):
const timMs = Math.round(video.currentTime * 1000);
// Find nearest annotated frame within tolerance (e.g. ±100ms — tighter than skeleton's ±300ms)
// because annotations are user-placed at exact pause points
const nearestAnnotatedMs = findNearestAnnotatedFrame(annotationsMap, timMs, 100);
const currentShapes = nearestAnnotatedMs != null ? annotationsMap.get(nearestAnnotatedMs) ?? [] : [];
// Pass currentShapes to AnnotationCanvas as a prop — it renders them read-only during playback
```

---

### Anti-Patterns to Avoid

- **Storing absolute pixel coordinates in Supabase:** Breaks replay on different screen sizes. Always normalize to 0–1 and multiply by display dimensions on render.
- **Single canvas for skeleton + annotations:** Clearing the canvas on timeupdate to redraw the skeleton also wipes annotations. Keep them on separate canvases.
- **`useEffect` for every shape addition:** React state for current frame's shapes triggers re-renders; use ref for in-progress drawing (current line points) and state only for completed shapes.
- **Separate save call per stroke:** Debounce or batch saves — save the entire frame's shapes array on exit from annotation mode (Escape / click-away), not after every stroke.
- **Dynamic import for react-konva in a server component:** The entire `AnnotationCanvas` must be `'use client'` — Konva accesses `window`/`document` on import. Wrap with `dynamic(() => import('./AnnotationCanvas'), { ssr: false })` if used inside a server component tree.
- **Pinch zoom without `Konva.hitOnDragEnabled = true`:** Two-finger touchmove will not fire correctly during drag without this flag.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas hit detection | Custom point-in-polygon, per-shape click testing | Konva built-in | Konva uses internal hit canvas for O(1) per-pixel hit testing on all shapes |
| Multi-touch pan/zoom | Custom gesture recognizer | Konva Stage touch events + documented pattern | Browser touch geometry is complex; Konva's documented pattern handles edge cases |
| Arrow shape geometry | Custom arrowhead polygon math | `Konva.Arrow` | Built-in pointerLength/pointerWidth; inherits all Line properties |
| Freehand smoothing | Bezier curve fitting | Konva.Line `tension={0.5}` | Catmull-Rom spline via tension parameter; built-in |
| Object selection/transform | Custom bounding box, resize handles | Konva.Transformer | Built-in transform handles — not needed for v1 but avoid re-inventing for later |
| Shape serialization | Custom serializer | JSON.stringify(shapes) with normalized coordinates | Shapes are plain JS objects; JSONB stores them directly |

**Key insight:** The annotation feature domain looks deceptively simple but has many edge cases at the canvas event layer (pointer events vs touch vs stylus, hit detection, undo state branching). Konva solves all of these; using raw canvas would require 3–5x the implementation work for no user-visible benefit.

---

## Common Pitfalls

### Pitfall 1: React 19 / react-konva Version Mismatch
**What goes wrong:** Installing `react-konva@18.x` with `react@19.x` causes peer dependency conflicts and runtime errors.
**Why it happens:** react-konva v19.x is required for React 19 (project uses react@19.2.3 per package.json).
**How to avoid:** Install `react-konva@^19` explicitly. Confirm: `npm install konva react-konva` — npm resolves to react-konva@19.x with React 19 installed.
**Warning signs:** Console peer dependency warnings, or Konva events not firing.

### Pitfall 2: Absolute Pixel Coordinates Break Cross-Device Replay
**What goes wrong:** Annotations drawn on a 1440px wide desktop display appear in the wrong position on an iPad (768px canvas width).
**Why it happens:** Storing `{ x: 720, y: 300 }` is device-specific.
**How to avoid:** Always normalize: `normalizedX = x / stageWidth`, `normalizedY = y / stageHeight`. Denormalize on render: `renderX = normalizedX * currentStageWidth`.
**Warning signs:** Annotations look shifted or clipped when switching screen sizes.

### Pitfall 3: Canvas Size Mismatch with Video Dimensions
**What goes wrong:** Annotation canvas is CSS-sized differently than the video element's rendered dimensions, causing click coordinates to be offset.
**Why it happens:** Phase 2 already solved this for the skeleton canvas (uses `canvas.clientWidth / clientHeight`). The same discipline applies to the Konva Stage.
**How to avoid:** Size the Konva Stage to match the video element's rendered `clientWidth` × `clientHeight`, not the video's natural resolution. Use a ResizeObserver on the video container.
**Warning signs:** Clicks don't align with drawn shapes; annotations drift on resize.

### Pitfall 4: Frame Step Size Mismatch
**What goes wrong:** Frame stepping by `1/30s` skips frames if the video was transcoded at 25fps, or shows duplicate frames at 60fps.
**Why it happens:** The Inngest transcoding worker uses FFmpeg; the output frame rate depends on the source clip.
**How to avoid:** Read `video.getVideoPlaybackQuality()` (Chrome) for dropped frames hint, or use `requestVideoFrameCallback` on first playback to sample the actual frame interval. Fall back to `1/30s` (30fps) as the practical default for softball video.
**Warning signs:** Coach hits arrow key and video doesn't visually change (jumped to same frame), or jumps two frames.

### Pitfall 5: Save Race Condition on Rapid Exit
**What goes wrong:** Coach draws shapes, immediately hits Escape — save request fires while component is unmounting; Supabase call is abandoned.
**Why it happens:** `useEffect` cleanup runs before async save completes.
**How to avoid:** Use `navigator.sendBeacon` for the save-on-exit case, or ensure save is triggered synchronously before the mode transition: `await save(); setMode('playback')`. Display a toast on save failure with retry.
**Warning signs:** Annotations disappear when reopening the video after a quick draw-and-exit.

### Pitfall 6: Annotation Canvas Intercepts Video Controls
**What goes wrong:** In annotation mode, the Konva Stage sits above the native `<video controls>` element and captures click events, breaking the play/pause button.
**Why it happens:** Absolutely-positioned canvas with `pointer-events: auto` covers the control bar.
**How to avoid:** Position the annotation canvas to cover only the video frame area (not the control bar). Or use a custom video control bar (recommended: gives full control over layout and pointer routing). The control bar lives below the canvas stack.
**Warning signs:** Play/pause button stops working when annotation canvas is active.

### Pitfall 7: Undo/Redo History Grows Without Bound
**What goes wrong:** Coach annotates many frames; history array accumulates thousands of shape-arrays in memory.
**Why it happens:** History array is never pruned.
**How to avoid:** Cap history at 50 entries per frame. When `history.current.length > 50`, shift the oldest entry.
**Warning signs:** Memory usage climbs during long annotation sessions.

---

## Code Examples

### Slow Motion Speed Control
```typescript
// Source: MDN HTMLMediaElement.playbackRate
// Works with HLS.js — HLS.js does not override playbackRate

function SpeedControl({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const speeds = [0.25, 0.5, 1.0];
  const [activeSpeed, setActiveSpeed] = useState(1.0);

  function handleSpeed(rate: number) {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setActiveSpeed(rate);
  }

  return (
    <div className="flex gap-1">
      {speeds.map(s => (
        <button
          key={s}
          onClick={() => handleSpeed(s)}
          className={activeSpeed === s ? 'text-white' : 'text-neutral-400'}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}
```

### Swipe Gesture for Frame Stepping (Touch)
```typescript
// Pointer events handle mouse, touch, and stylus uniformly
// Track delta X on pointerdown/pointerup; step frame if delta > threshold and video is paused

function useSwipeFrameStep(videoRef: React.RefObject<HTMLVideoElement>) {
  const startX = useRef<number | null>(null);
  const THRESHOLD_PX = 30; // px swipe required to advance one frame
  const FRAME_STEP = 1 / 30;

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        startX.current = e.clientX;
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startX.current == null) return;
      const delta = e.clientX - startX.current;
      const video = videoRef.current;
      if (video && video.paused && Math.abs(delta) > THRESHOLD_PX) {
        video.currentTime = Math.max(0,
          Math.min(video.duration, video.currentTime + (delta > 0 ? FRAME_STEP : -FRAME_STEP))
        );
      }
      startX.current = null;
    },
  };
}
```

### useAnnotations Hook Sketch
```typescript
// src/hooks/useAnnotations.ts
export function useAnnotations(videoId: string) {
  const [annotationsMap, setAnnotationsMap] = useState<Map<number, AnnotationShape[]>>(new Map());
  const supabase = createBrowserClient(...);

  // Load all frames on mount
  useEffect(() => {
    supabase
      .from('video_annotations')
      .select('frame_timestamp_ms, shapes')
      .eq('video_id', videoId)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<number, AnnotationShape[]>();
        data.forEach(row => map.set(row.frame_timestamp_ms, row.shapes));
        setAnnotationsMap(map);
      });
  }, [videoId]);

  // Upsert one frame
  async function saveFrame(frameTimestampMs: number, shapes: AnnotationShape[]) {
    await supabase
      .from('video_annotations')
      .upsert({ video_id: videoId, frame_timestamp_ms: frameTimestampMs, shapes },
               { onConflict: 'video_id,frame_timestamp_ms' });
    setAnnotationsMap(prev => new Map(prev).set(frameTimestampMs, shapes));
  }

  return { annotationsMap, saveFrame };
}
```

### Timeline Annotation Markers
```tsx
// Extend AnalysisTimeline.tsx — add annotation dots with same visual pattern as AI flagged markers
// Color: blue or distinct from AI markers (red/yellow) — Claude's discretion
{annotatedTimestamps.map(tsMs => (
  <div
    key={tsMs}
    className="absolute top-1 h-6 w-1.5 rounded-sm bg-blue-400 opacity-80 z-20"
    style={{ left: `${(tsMs / 1000 / videoDurationSec) * 100}%`, transform: 'translateX(-50%)' }}
    title={`Annotated frame at ${(tsMs / 1000).toFixed(1)}s`}
  />
))}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `video.seekToNextFrame()` for frame stepping | `video.currentTime += 1/fps` | Always — seekToNextFrame() was experimental and removed from most browsers | Use currentTime increment; seekToNextFrame is not reliable |
| `timeupdate` for annotation sync | `requestVideoFrameCallback` for high-precision sync | Chrome 83, Firefox 130, Safari 15.4 (October 2024 — now universally supported) | Can use either; `timeupdate` fires ~4Hz at 0.25x which is sufficient; `requestVideoFrameCallback` gives per-frame precision if needed |
| Fabric.js (v2-v5) as standard canvas library | Konva.js + react-konva | ~2022–2023 | Fabric v6 rewrote the API (breaking); Konva is the current standard for interactive React canvas; Fabric still viable for image manipulation use cases |

**Deprecated/outdated:**
- `HTMLMediaElement.seekToNextFrame()`: Removed from Firefox, never in Chrome — do not use
- `fabricjs-react` wrapper for Fabric.js v6: Community-maintained, lags behind Fabric releases — do not use
- Storing annotations in browser localStorage: Insufficient for cross-device coaching workflow — use Supabase

---

## Open Questions

1. **FFmpeg output frame rate from Phase 1 Inngest worker**
   - What we know: Phase 1 uses Inngest + FFmpeg for transcoding; output is HLS
   - What's unclear: Whether FFmpeg is configured to output at a fixed fps (e.g., 30fps) or pass-through source fps
   - Recommendation: In Plan 1, read the `transcode-video.ts` Inngest function to check the FFmpeg command. If no `-r` flag is set, the source fps is preserved. Implement `requestVideoFrameCallback` on first playback to detect actual frame duration, store in a ref, and use it for stepping.

2. **Canvas size responsiveness during orientation change (iPad)**
   - What we know: Phase 2 solved skeleton canvas sizing with `canvas.clientWidth` on every draw; same discipline applies
   - What's unclear: Whether react-konva Stage re-renders correctly on orientation change without an explicit resize handler
   - Recommendation: Wire a `ResizeObserver` on the video container element. Update Stage `width`/`height` state when the container resizes. This triggers a Konva re-render with correct dimensions.

3. **Annotation save strategy on mobile (background tab / app switch)**
   - What we know: `navigator.sendBeacon` fires even on page unload; saves are async
   - What's unclear: Whether the save-on-Escape pattern is sufficient for iPad users who leave the app mid-session
   - Recommendation: In addition to save-on-exit, auto-save after each completed shape (debounced 1s). This is the safest pattern for mobile where users switch apps frequently.

---

## Sources

### Primary (HIGH confidence)
- Konva.js official docs — Arrow API, Free Drawing, Undo/Redo, Multi-touch Scale Stage, Arc, Label shapes: https://konvajs.org/docs/react/Free_Drawing.html, https://konvajs.org/docs/react/Undo-Redo.html, https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html, https://konvajs.org/api/Konva.Arrow.html
- MDN Web Docs — HTMLMediaElement.playbackRate: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
- MDN Web Docs — HTMLVideoElement.requestVideoFrameCallback: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- MDN Web Docs — PointerEvent API: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
- web.dev — requestVideoFrameCallback per-frame operations: https://web.dev/articles/requestvideoframecallback-rvfc
- Supabase Docs — Managing JSON: https://supabase.com/docs/guides/database/json
- npm react-konva — React 19 compatibility confirmed (v19.x series): https://www.npmjs.com/package/react-konva

### Secondary (MEDIUM confidence)
- Konva.js vs Fabric.js comparison — multiple sources confirm Konva is preferred for interactive React canvas, Fabric preferred for image manipulation: https://dev.to/lico/react-comparison-of-js-canvas-libraries-konvajs-vs-fabricjs-1dan, https://medium.com/@www.blog4j.com/konva-js-vs-fabric-js-in-depth-technical-comparison-and-use-case-analysis-9c247968dd0f
- Next.js SSR workaround for canvas libraries — `dynamic({ ssr: false })` or `'use client'` + no top-level window access: https://dev.to/devin-rosario/stop-window-is-not-defined-in-nextjs-2025-394j

### Tertiary (LOW confidence)
- Frame step accuracy at ±1/30s for HLS streams — practical for coaching review; not verified against Phase 1 Inngest FFmpeg output frame rate. Validate during Plan 1 implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-konva v19 / React 19 compatibility confirmed via npm; Konva Arrow/Line/Arc/Text API verified via official docs
- Architecture: HIGH — two-canvas stacking, normalized coordinates, annotation state machine, and Supabase upsert patterns are all verified against official sources or existing Phase 2 code
- Pitfalls: MEDIUM-HIGH — canvas size mismatch and coordinate normalization verified from Phase 2 experience; React 19 version mismatch verified via npm; frame step accuracy is LOW (needs empirical validation against actual HLS output)

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (react-konva and Konva APIs are stable; 30-day window sufficient)
