-- Apply with: supabase db push
-- Or in Supabase dashboard: SQL Editor → run this file

-- ============================================================
-- Phase 1: Foundation Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
-- One profile per user. role is 'coach' or 'athlete'.
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roster: many-to-many coach <-> athlete relationship
-- athlete_id is NULL until the athlete accepts their invite
CREATE TABLE coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  athlete_id UUID REFERENCES profiles(id),  -- NULL = pending invite
  athlete_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT,
  raw_r2_key TEXT NOT NULL,
  hls_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'reviewed', 'delivered', 'error')),
  duration_seconds INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  transcoded_at TIMESTAMPTZ
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- PROFILES policies (4 separate policies per Supabase recommendation)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Coach can read athlete profiles (to show names in roster/dashboard)
CREATE POLICY "profiles_select_coach_athletes" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = auth.uid()
        AND athlete_id IS NOT NULL
    )
  );

-- COACH_ATHLETES policies
CREATE POLICY "coach_athletes_select_own" ON coach_athletes
  FOR SELECT USING (coach_id = auth.uid() OR athlete_id = auth.uid());

CREATE POLICY "coach_athletes_insert_coach" ON coach_athletes
  FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_athletes_update_coach" ON coach_athletes
  FOR UPDATE USING (coach_id = auth.uid());

-- VIDEOS policies
-- Coach sees videos for their athletes
CREATE POLICY "videos_select_coach" ON videos
  FOR SELECT USING (coach_id = auth.uid());

-- Athlete sees only their own videos
CREATE POLICY "videos_select_athlete" ON videos
  FOR SELECT USING (athlete_id = auth.uid());

-- Both coach and athlete can insert (athlete uploads their own; coach uploads on behalf)
CREATE POLICY "videos_insert_authenticated" ON videos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      -- Coach uploading for one of their athletes
      auth.uid() = coach_id
      OR
      -- Athlete uploading their own video
      auth.uid() = athlete_id
    )
  );

-- Only coach can update video status (transcoding updates via service role bypass)
CREATE POLICY "videos_update_coach" ON videos
  FOR UPDATE USING (coach_id = auth.uid());

-- ============================================================
-- Trigger: auto-create profile on new user signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'coach'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
