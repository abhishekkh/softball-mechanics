# Phase 1: Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches and athletes can access the app with proper role separation, upload videos that transcode and stream reliably via HLS, and coaches can manage their athlete roster. Creating accounts, inviting athletes, uploading videos, and viewing role-scoped dashboards are all in scope. AI analysis, annotations, and feedback delivery are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Video upload initiation
- Native camera capture on mobile (open device camera directly)
- File picker button on desktop
- Both coach and athlete can upload videos — athletes upload their own footage, coaches can also upload on behalf of athletes

### Upload session behavior
- Multiple files can be uploaded in one session (queue several at once)
- Coach assigns the video to a specific athlete during the upload flow (not after)
- Progress indicator stays on the same page during the ~2 minute transcoding wait — no redirect

### Coach dashboard (session queue)
- List view sorted by most recent upload
- Each session row shows: video thumbnail, athlete name + avatar, upload date/time, status badge
- Status badge states: Processing / Ready for Review / Reviewed / Delivered

### Athlete view
- Athlete sees their own submission list on login — videos they uploaded and videos the coach uploaded for them
- Athlete and coach have distinct role-scoped views with different content

### Claude's Discretion
- Athlete invite & access flow — implementation approach, email vs SMS, one-time vs persistent link, first-time vs returning athlete experience
- Roster management UX — how coach lists, invites, and manages athletes
- Loading skeleton design, error state messaging, exact spacing and typography
- Empty state content for new coaches with no sessions yet

</decisions>

<specifics>
## Specific Ideas

- No specific references mentioned — open to standard approaches for the undiscussed areas
- Mobile-first upload behavior: native camera is primary on mobile, not a fallback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-26*
