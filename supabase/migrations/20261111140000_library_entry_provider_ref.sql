/*
# Remember the provider record behind a saved title

Library rows kept only `title_id`, a YuriOrbit slug. Resolving that slug later
meant searching the providers by name, which can miss when a title is renamed,
merged, or the slug registry expires — the saved entry then opened to
"Title not found".

Storing the upstream record makes resolution exact: the app can fetch the title
straight from AniList, MangaDex or TMDB by id instead of guessing by name.

`provider` already exists. This adds the matching `provider_id` (AniList id,
MangaDex uuid, or TMDB numeric id) and deliberately leaves the public profile
view untouched: only the owner's own library needs the reference, and the
public view must keep exposing the same safe columns.
*/

ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS provider_id text;

COMMENT ON COLUMN library_entries.provider_id IS
  'Upstream provider record id (AniList id, MangaDex uuid, TMDB numeric id).';
