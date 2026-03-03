-- 008_fix_rls_write_policies.sql
-- Fix: Replace USING(true)/WITH CHECK(true) write policies on video_analyses
-- and video_analysis_frames with coach-ownership-scoped policies.
-- The service role bypasses RLS entirely, so these restrictions only affect
-- regular user tokens — Inngest workers are unaffected.

-- video_analyses: DROP old policies, CREATE scoped replacements
DROP POLICY IF EXISTS "Service role can insert analyses" ON video_analyses;
DROP POLICY IF EXISTS "Service role can update analyses" ON video_analyses;

CREATE POLICY "Coaches can insert own video analyses"
  ON video_analyses FOR INSERT
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own video analyses"
  ON video_analyses FOR UPDATE
  USING (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );

-- video_analysis_frames: DROP old policies, CREATE scoped replacements
DROP POLICY IF EXISTS "Service role can insert frame data" ON video_analysis_frames;
DROP POLICY IF EXISTS "Service role can upsert frame data" ON video_analysis_frames;

CREATE POLICY "Coaches can insert own frame data"
  ON video_analysis_frames FOR INSERT
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own frame data"
  ON video_analysis_frames FOR UPDATE
  USING (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );
