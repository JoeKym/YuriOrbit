import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '@/lib/analytics/traffic';

let last: { path: string; at: number } | null = null;

/** Records a first-party page view whenever the route changes. */
export function TrafficTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Guard against duplicate effect runs (e.g. StrictMode) for one navigation.
    if (last && last.path === pathname && Date.now() - last.at < 1000) return;
    last = { path: pathname, at: Date.now() };
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
