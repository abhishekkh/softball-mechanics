-- Store the athlete's name and team at invite time so they appear on the
-- roster before the athlete accepts and creates their profile.
ALTER TABLE coach_athletes ADD COLUMN athlete_name TEXT;
ALTER TABLE coach_athletes ADD COLUMN team TEXT;
