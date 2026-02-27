-- video_analyses: one row per video, tracks analysis lifecycle
CREATE TABLE video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'complete', 'error', 'low_confidence')),
  progress_pct INTEGER DEFAULT 0,
  frame_count INTEGER,
  analyzed_at TIMESTAMPTZ,
  error_message TEXT,
  framing_warning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id)
);

-- video_analysis_frames: one row per sampled frame (5fps)
CREATE TABLE video_analysis_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  landmarks JSONB NOT NULL,
  elbow_slot_deg REAL,
  shoulder_tilt_deg REAL,
  hip_rotation_deg REAL,
  flags JSONB,
  UNIQUE(video_id, frame_index)
);

CREATE INDEX idx_vaf_video_id ON video_analysis_frames(video_id);
CREATE INDEX idx_vaf_video_ts ON video_analysis_frames(video_id, timestamp_ms);

-- RLS: same visibility rules as videos table
-- coaches see their own videos' analysis; athletes see their own
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analysis_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read own video analyses"
  ON video_analyses FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can read own video analyses"
  ON video_analyses FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM videos WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert analyses"
  ON video_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update analyses"
  ON video_analyses FOR UPDATE
  USING (true);

CREATE POLICY "Coaches can read own frame data"
  ON video_analysis_frames FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM videos WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can read own frame data"
  ON video_analysis_frames FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM videos WHERE athlete_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert frame data"
  ON video_analysis_frames FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can upsert frame data"
  ON video_analysis_frames FOR UPDATE
  USING (true);
