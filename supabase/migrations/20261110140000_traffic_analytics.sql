-- ─── first-party traffic analytics ───────────────────────────────────────────
--
-- No external tracker: the app records one row per page view with a random
-- per-tab session id, the path, a first-touch source host, and a coarse device
-- class. No IP addresses, user ids, or full referrer URLs are stored.
--
-- Clients may INSERT only; reading is restricted to the admin API (service
-- role) through the aggregation function below.

CREATE TABLE IF NOT EXISTS public.traffic_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  path text NOT NULL,
  source text NOT NULL DEFAULT 'Direct',
  device text NOT NULL DEFAULT 'Desktop'
);

CREATE INDEX IF NOT EXISTS traffic_events_created_at_idx ON public.traffic_events (created_at DESC);
CREATE INDEX IF NOT EXISTS traffic_events_session_idx ON public.traffic_events (session_id);

ALTER TABLE public.traffic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traffic_insert" ON public.traffic_events;
CREATE POLICY "traffic_insert"
  ON public.traffic_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(session_id) BETWEEN 8 AND 64
    AND length(path) BETWEEN 1 AND 300
    AND length(source) BETWEEN 1 AND 120
    AND device IN ('Desktop', 'Mobile', 'Tablet')
  );

-- Admin-only aggregation. Service role bypasses RLS; clients have no access.
CREATE OR REPLACE FUNCTION public.admin_traffic_stats(
  p_since timestamptz,
  p_until timestamptz,
  p_bucket text DEFAULT 'day',
  p_tz text DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT created_at, session_id, path, source, device
    FROM public.traffic_events
    WHERE created_at >= p_since AND created_at < p_until
  ),
  totals AS (
    SELECT count(*)::int AS pageviews, count(DISTINCT session_id)::int AS visitors
    FROM filtered
  ),
  bounce AS (
    SELECT count(*)::int AS n
    FROM (
      SELECT session_id FROM filtered GROUP BY session_id HAVING count(*) = 1
    ) single_view
  ),
  series AS (
    SELECT date_trunc(
             CASE WHEN p_bucket = 'hour' THEN 'hour' ELSE 'day' END,
             created_at AT TIME ZONE COALESCE(NULLIF(p_tz, ''), 'UTC')
           ) AT TIME ZONE COALESCE(NULLIF(p_tz, ''), 'UTC') AS bucket,
           count(*)::int AS views
    FROM filtered
    GROUP BY 1
    ORDER BY 1
  ),
  pages AS (
    SELECT path, count(*)::int AS views
    FROM filtered
    GROUP BY 1
    ORDER BY views DESC, path
    LIMIT 10
  ),
  session_first AS (
    SELECT DISTINCT ON (session_id) session_id, source, device
    FROM filtered
    ORDER BY session_id, created_at
  ),
  sources AS (
    SELECT source, count(*)::int AS visits
    FROM session_first
    GROUP BY 1
    ORDER BY visits DESC
    LIMIT 8
  ),
  devices AS (
    SELECT device, count(*)::int AS visits
    FROM session_first
    GROUP BY 1
    ORDER BY visits DESC
  ),
  live AS (
    SELECT DISTINCT ON (session_id) session_id, path, created_at
    FROM public.traffic_events
    WHERE created_at >= now() - interval '5 minutes'
    ORDER BY session_id, created_at DESC
  ),
  live_sorted AS (
    SELECT session_id, path, created_at FROM live ORDER BY created_at DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'pageviews', (SELECT pageviews FROM totals),
    'visitors', (SELECT visitors FROM totals),
    'viewsPerVisit', (
      SELECT CASE WHEN visitors > 0 THEN round(pageviews::numeric / visitors, 2) ELSE 0 END FROM totals
    ),
    'bounceRate', (
      SELECT CASE WHEN t.visitors > 0 THEN round(b.n::numeric * 100 / t.visitors, 0) ELSE 0 END
      FROM totals t, bounce b
    ),
    'series', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('t', bucket, 'views', views) ORDER BY bucket) FROM series),
      '[]'::jsonb
    ),
    'topPages', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views) ORDER BY views DESC, path) FROM pages),
      '[]'::jsonb
    ),
    'sources', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('source', source, 'visits', visits) ORDER BY visits DESC) FROM sources),
      '[]'::jsonb
    ),
    'devices', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('device', device, 'visits', visits) ORDER BY visits DESC) FROM devices),
      '[]'::jsonb
    ),
    'live', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('session', session_id, 'path', path, 'lastSeen', created_at)
          ORDER BY created_at DESC
        )
        FROM live_sorted
      ),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.admin_traffic_stats(timestamptz, timestamptz, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_traffic_stats(timestamptz, timestamptz, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_traffic_stats(timestamptz, timestamptz, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_traffic_stats(timestamptz, timestamptz, text, text) TO service_role;
