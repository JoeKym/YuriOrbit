-- ─── moderation privacy + self-service read ──────────────────────────────────
--
-- site_settings is readable by anon/authenticated, which previously exposed the
-- whole user_moderation map (every moderated user's reason) to anyone. Keep the
-- public setting keys public, but hide the moderation key and expose only the
-- caller's own entry through a security-definer function.
--
-- The function also returns the caller's auth.users.banned_until so the app can
-- detect a ban even when the best-effort moderation note was never written.

DROP POLICY IF EXISTS "read_site_settings" ON public.site_settings;
CREATE POLICY "read_site_settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (key <> 'user_moderation');

CREATE OR REPLACE FUNCTION public.get_my_moderation()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'entry', (
      SELECT s.value -> auth.uid()::text
      FROM public.site_settings s
      WHERE s.key = 'user_moderation'
        AND auth.uid() IS NOT NULL
    ),
    'banned_until', (
      SELECT u.banned_until
      FROM auth.users u
      WHERE u.id = auth.uid()
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_moderation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_moderation() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_moderation() TO authenticated;
