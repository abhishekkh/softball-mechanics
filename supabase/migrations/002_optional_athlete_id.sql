-- Migration 002: Make athlete_id optional on videos table
-- Coaches can now upload videos without assigning an athlete (deferred assignment)

-- Drop NOT NULL constraint on athlete_id
ALTER TABLE videos ALTER COLUMN athlete_id DROP NOT NULL;

-- Replace the INSERT policy to allow null athlete_id when coach uploads
DROP POLICY IF EXISTS "videos_insert_authenticated" ON videos;

CREATE POLICY "videos_insert_authenticated" ON videos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      -- Coach uploading for one of their athletes
      auth.uid() = coach_id
      OR
      -- Athlete uploading their own video
      auth.uid() = athlete_id
      OR
      -- Coach uploading without athlete assignment (deferred assignment)
      (auth.uid() = coach_id AND athlete_id IS NULL)
    )
  );
