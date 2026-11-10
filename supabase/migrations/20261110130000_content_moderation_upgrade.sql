-- ─── content moderation: hide internals, expose a sanitized map ───────────────
--
-- The client needs every title's action to hide taken-down content, but the
-- stored entries also carry internal notes and the admin's email. Hide the raw
-- row from public reads and expose only the fields browsing needs.

DROP POLICY IF EXISTS "read_site_settings" ON public.site_settings;
CREATE POLICY "read_site_settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (key NOT IN ('user_moderation', 'content_moderation'));

CREATE OR REPLACE FUNCTION public.get_content_moderation()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(
        entry.key,
        jsonb_build_object(
          'titleId', entry.value -> 'titleId',
          'title', entry.value -> 'title',
          'action', entry.value -> 'action',
          'reason', entry.value -> 'reason',
          'expiresAt', entry.value -> 'expiresAt',
          'updatedAt', entry.value -> 'updatedAt'
        )
      )
      FROM public.site_settings s
      CROSS JOIN LATERAL jsonb_each(
        CASE WHEN jsonb_typeof(s.value) = 'object' THEN s.value ELSE '{}'::jsonb END
      ) AS entry
      WHERE s.key = 'content_moderation'
    ),
    '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.get_content_moderation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_moderation() TO anon, authenticated;
