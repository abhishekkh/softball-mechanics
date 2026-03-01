-- Phase 2.2: Add motion_type to videos table
-- Used by upload flow (coach/athlete tags motion at upload time) and
-- analysis pipeline (dispatches motion-specific flag logic).
-- DEFAULT 'unknown' preserves backward compat for pre-Phase-2.2 rows.
-- CHECK constraint is intentionally permissive: unknown is valid (untagged).

ALTER TABLE videos
  ADD COLUMN motion_type TEXT
    CHECK (motion_type IN ('hitting', 'pitching', 'unknown'))
    DEFAULT 'unknown';
