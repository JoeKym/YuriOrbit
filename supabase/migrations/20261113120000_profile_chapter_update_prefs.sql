-- YuriOrbit: keep the library's chapter-update preferences on the account.
--
-- Guests keep both switches in localStorage; signed-in visitors get them here so
-- they follow them across devices, the same way watch_region already works
-- (20261111120000_profile_watch_region.sql). Row Level Security restricts profile
-- updates to the row's owner, so no policy change is needed.
--
-- Read defensively by the client: a deployment that has not run this migration
-- falls back to browser-local preferences instead of failing the profile fetch.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chapter_badges boolean NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chapter_updates_reading_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.chapter_badges IS
  'Show "new chapters" badges and the New chapters filter in the library.';

COMMENT ON COLUMN profiles.chapter_updates_reading_only IS
  'Only check for new releases on titles marked Currently Reading.';
