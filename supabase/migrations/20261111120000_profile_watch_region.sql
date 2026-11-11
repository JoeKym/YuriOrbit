-- YuriOrbit: remember each visitor's streaming region on their profile.
--
-- Guests keep the choice in localStorage; signed-in visitors get it here so it
-- follows them across devices. Row Level Security already restricts profile
-- updates to the row's owner (20261107120000_profiles_featured_settings_audit.sql),
-- so no policy change is needed.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS watch_region text;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_watch_region_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_watch_region_check
  CHECK (watch_region IS NULL OR watch_region ~ '^[A-Z]{2}$');

COMMENT ON COLUMN profiles.watch_region IS
  'ISO 3166-1 alpha-2 country used for TMDB streaming availability; NULL = auto-detect.';
