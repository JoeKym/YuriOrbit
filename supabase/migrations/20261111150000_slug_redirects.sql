/*
# One canonical URL per story, shared across devices

Slug aliases were kept in browser localStorage, so a title merged on one device
could keep a different URL on another. This table makes the mapping global:
`alias_slug` is an old YuriOrbit URL and `canonical_slug` is the URL that should
serve it from now on.

Reads are public; writes go through `register_slug_redirect`, which validates
the slug shape, refuses self-redirects and refuses to make an existing canonical
slug an alias (the simple cycle guard). The client follows chains regardless, so
a mistaken chain still terminates.

Apply after 20261111140000_library_entry_provider_ref.sql. Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS slug_redirects (
  alias_slug text PRIMARY KEY,
  canonical_slug text NOT NULL,
  provider text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_redirect_not_self CHECK (alias_slug <> canonical_slug),
  CONSTRAINT slug_redirect_alias_shape CHECK (alias_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT slug_redirect_canonical_shape CHECK (canonical_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_slug_redirects_canonical ON slug_redirects(canonical_slug);

ALTER TABLE slug_redirects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON slug_redirects TO anon, authenticated;

DROP POLICY IF EXISTS "read_slug_redirects" ON slug_redirects;
CREATE POLICY "read_slug_redirects"
  ON slug_redirects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION register_slug_redirect(
  p_alias text,
  p_canonical text,
  p_provider text DEFAULT NULL,
  p_provider_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only well-formed, different slugs are allowed.
  IF p_alias IS NULL OR p_canonical IS NULL OR p_alias = p_canonical THEN
    RETURN;
  END IF;
  IF p_alias !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR p_canonical !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN;
  END IF;

  -- Do not let a canonical URL be redirected away; that would create a cycle.
  IF EXISTS (SELECT 1 FROM slug_redirects WHERE canonical_slug = p_alias) THEN
    RETURN;
  END IF;

  INSERT INTO slug_redirects (alias_slug, canonical_slug, provider, provider_id)
  VALUES (p_alias, p_canonical, p_provider, p_provider_id)
  ON CONFLICT (alias_slug) DO UPDATE
    SET canonical_slug = EXCLUDED.canonical_slug,
        provider = COALESCE(EXCLUDED.provider, slug_redirects.provider),
        provider_id = COALESCE(EXCLUDED.provider_id, slug_redirects.provider_id),
        updated_at = now()
    WHERE slug_redirects.canonical_slug IS DISTINCT FROM EXCLUDED.canonical_slug;
END;
$$;

REVOKE ALL ON FUNCTION register_slug_redirect(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION register_slug_redirect(text, text, text, text) TO anon, authenticated;

COMMENT ON TABLE slug_redirects IS
  'Old YuriOrbit slugs mapped to the canonical slug that should serve them.';
