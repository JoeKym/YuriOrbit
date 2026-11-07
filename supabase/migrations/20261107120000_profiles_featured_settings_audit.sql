/*
# YuriOrbit: public profiles, featured titles, site settings, admin audit log

Independent Supabase project (not Bolt-managed) migration.
Project: https://kqsrojnzmdcxhuwulmgf.supabase.co
Applies on top of the existing library_entries table (user_id uuid -> auth.users).

Backs:
  1. /user/{username}          -> profiles + public-library read policy
  2. Homepage "Editor's Picks" -> featured_titles
  3. Site-wide announcement banner + admin audit trail -> site_settings + admin_audit_log

Safe to re-run: every statement is idempotent.
*/

-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 280)
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (lower(username));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "read_public_profiles" ON profiles;
CREATE POLICY "read_public_profiles"
  ON profiles FOR SELECT TO anon, authenticated
  USING (is_public OR auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── public library read access ──────────────────────────────────────────────

-- library_entries already exists in this project with user_id uuid -> auth.users(id).
-- This policy lets anyone read the library of a PUBLIC profile.
DROP POLICY IF EXISTS "read_public_profile_libraries" ON library_entries;
CREATE POLICY "read_public_profile_libraries"
  ON library_entries FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = library_entries.user_id AND p.is_public
    )
  );

-- ─── featured titles (homepage Editor's Picks) ───────────────────────────────

CREATE TABLE IF NOT EXISTS featured_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id text NOT NULL UNIQUE,
  title text NOT NULL,
  cover_image text,
  note text,
  content_type text NOT NULL DEFAULT 'MANGA',
  position integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS featured_titles_position_idx ON featured_titles (position);

ALTER TABLE featured_titles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON featured_titles TO anon, authenticated;

DROP POLICY IF EXISTS "read_featured_titles" ON featured_titles;
CREATE POLICY "read_featured_titles"
  ON featured_titles FOR SELECT TO anon, authenticated
  USING (true);

-- ─── site settings ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON site_settings TO anon, authenticated;

DROP POLICY IF EXISTS "read_site_settings" ON site_settings;
CREATE POLICY "read_site_settings"
  ON site_settings FOR SELECT TO anon, authenticated
  USING (true);

-- Seed the announcement-banner key so the banner component never crashes.
-- The value is the shape the frontend expects; toggles are driven by the frontend.
INSERT INTO site_settings (key, value, updated_by)
VALUES ('announcement_banner', '{"enabled":false,"text":null,"link":null,"linkText":null}', 'migration')
ON CONFLICT (key) DO NOTHING;

-- ─── admin audit log ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text NOT NULL,
  action text NOT NULL,
  target text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies/grants: service role only.
