/*
# Public profile libraries: column-safe read path

Why
---
`read_public_profile_libraries` (20261107120000) let `anon` and `authenticated`
read the library_entries rows of every PUBLIC profile. Row Level Security works
per row, never per column, so that policy also exposed `notes` (private reading
notes) to anyone querying the REST API directly — data the public profile page
never displayed.

What this migration does
------------------------
1. Creates `public_profile_libraries`, a read-only view that returns only the
   fields a public profile legitimately shows, and only for public profiles
   (plus the viewer's own rows, so a private profile still sees itself).
2. Drops the table-level public read policy, so the base table again returns
   nothing but the caller's own rows.
3. Grants SELECT on the view to anon/authenticated and nothing else.

The view intentionally runs with the owner's privileges so it can read rows
across users; the WHERE clause is the whole access rule, so keep it intact.

Apply order: run this AFTER 20261107120000_profiles_featured_settings_audit.sql.
Safe to re-run: every statement is idempotent.

The site queries the view first and falls back to the base table with an
explicit column list (notes excluded) if the view is missing, so public profiles
keep working whether or not this is applied yet.
*/

BEGIN;

CREATE OR REPLACE VIEW public_profile_libraries AS
SELECT
  e.user_id,
  e.title_id,
  e.title,
  e.cover_image,
  e.content_type,
  e.status,
  e.progress,
  e.total_progress,
  e.rating,
  e.provider,
  e.added_at,
  e.updated_at
FROM library_entries e
JOIN profiles p ON p.id = e.user_id
WHERE p.is_public OR p.id = auth.uid();
-- NOTE: `notes` is deliberately absent. Do not add it back.

ALTER VIEW public_profile_libraries SET (security_invoker = false);

REVOKE ALL ON public_profile_libraries FROM public, anon, authenticated;
GRANT SELECT ON public_profile_libraries TO anon, authenticated;

-- The base table goes back to "you can only read your own rows".
DROP POLICY IF EXISTS "read_public_profile_libraries" ON library_entries;

COMMENT ON VIEW public_profile_libraries IS
  'Public-safe projection of library_entries for public profiles (excludes private notes).';

COMMIT;

-- Verification (run after applying):
--   -- returns nothing: notes are no longer reachable from the API
--   SELECT notes FROM library_entries LIMIT 1;
--   -- returns public titles only, never notes
--   SELECT title, status FROM public_profile_libraries LIMIT 5;
