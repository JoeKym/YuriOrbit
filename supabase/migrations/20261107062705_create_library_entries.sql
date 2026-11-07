/*
# Create library_entries table for synced personal libraries

## Summary
This migration creates the `library_entries` table that stores each user's
personal library (saved titles, reading status, progress, ratings, notes).
This replaces the previous browser-only local storage approach with a
cloud-synced version tied to Supabase Auth accounts. Each user can only
see and modify their own library entries.

## New Tables
- `library_entries`
  - `id` (uuid, primary key) — unique row identifier
  - `user_id` (uuid, not null, defaults to auth.uid()) — owner of the entry, references auth.users
  - `title_id` (text, not null) — the content title ID from the provider
  - `title` (text, not null) — display title (denormalized for fast listing)
  - `cover_image` (text, nullable) — cover image URL (denormalized)
  - `content_type` (text, not null) — one of MANGA, MANHWA, MANHUA, WEBTOON, LIGHT_NOVEL, WEB_NOVEL, BOOK, MOVIE, DRAMA, TV
  - `status` (text, not null) — one of CURRENT, PLANNED, COMPLETED, ON_HOLD, DROPPED, FAVOURITE
  - `progress` (integer, not null, default 0) — current chapter/episode number
  - `total_progress` (integer, nullable) — total chapters/episodes
  - `rating` (integer, nullable) — user rating 1-10
  - `notes` (text, nullable) — free-form user notes
  - `provider` (text, not null) — source provider: ANILIST, JIKAN, MANGADEX, TMDB, CURATED
  - `added_at` (timestamptz, not null, default now()) — when the entry was added
  - `updated_at` (timestamptz, not null, default now()) — last modification time

## Constraints
- `unique(user_id, title_id)` — a user can only have one library entry per title
- `rating` CHECK between 1 and 10 (nullable allowed)

## Indexes
- `idx_library_entries_user_id` on `user_id` for fast per-user queries
- `idx_library_entries_user_status` on `(user_id, status)` for filtered library views

## Security
- Row Level Security ENABLED on `library_entries`.
- GRANT SELECT, INSERT, UPDATE, DELETE to `authenticated` only (app requires sign-in).
- Four owner-scoped policies (select/insert/update/delete) using `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so inserts that omit user_id succeed.
*/

CREATE TABLE IF NOT EXISTS library_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id text NOT NULL,
  title text NOT NULL,
  cover_image text,
  content_type text NOT NULL,
  status text NOT NULL DEFAULT 'CURRENT',
  progress integer NOT NULL DEFAULT 0,
  total_progress integer,
  rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  notes text,
  provider text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_title UNIQUE (user_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_library_entries_user_id ON library_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_library_entries_user_status ON library_entries(user_id, status);

ALTER TABLE library_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON library_entries TO authenticated;

DROP POLICY IF EXISTS "select_own_library_entries" ON library_entries;
CREATE POLICY "select_own_library_entries"
  ON library_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_library_entries" ON library_entries;
CREATE POLICY "insert_own_library_entries"
  ON library_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_library_entries" ON library_entries;
CREATE POLICY "update_own_library_entries"
  ON library_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_library_entries" ON library_entries;
CREATE POLICY "delete_own_library_entries"
  ON library_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);