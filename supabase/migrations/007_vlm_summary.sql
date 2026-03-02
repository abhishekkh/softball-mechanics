-- Phase 02.3: Add VLM commentary column to video_analyses
-- Nullable — only populated when coach clicks "Get AI Commentary"
-- Persists across page loads so Gemini is not re-called on every view
ALTER TABLE video_analyses
  ADD COLUMN IF NOT EXISTS vlm_summary TEXT;
