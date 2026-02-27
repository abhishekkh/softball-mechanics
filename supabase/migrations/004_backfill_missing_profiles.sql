-- Backfill profiles for auth users created before the handle_new_user trigger existed.
-- Safe to re-run: ON CONFLICT DO NOTHING skips users who already have a profile.

INSERT INTO public.profiles (id, role, full_name, created_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'role', 'coach'),
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
