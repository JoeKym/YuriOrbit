import { supabase } from '@/lib/supabase';

/**
 * First-party page-view recording. One insert per route change; no cookies,
 * no external scripts, no IP addresses. A random per-tab id ties views into a
 * visit, and the external referrer host is captured once per visit.
 */

const SESSION_KEY = 'yuriorbit_traffic_session';
const SOURCE_KEY = 'yuriorbit_traffic_source';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function deviceClass(): 'Desktop' | 'Mobile' | 'Tablet' {
  const ua = navigator.userAgent;
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function sourceHost(): string {
  try {
    const stored = sessionStorage.getItem(SOURCE_KEY);
    if (stored) return stored;

    let source = 'Direct';
    const referrer = document.referrer;
    if (referrer) {
      try {
        const host = new URL(referrer).hostname.replace(/^www\./i, '');
        const self = window.location.hostname.replace(/^www\./i, '');
        if (host && host !== self) source = host.slice(0, 120);
      } catch {}
    }
    sessionStorage.setItem(SOURCE_KEY, source);
    return source;
  } catch {
    return 'Direct';
  }
}

export function trackPageview(pathname: string) {
  if (!supabase) return;
  if (typeof navigator === 'undefined') return;
  if (/bot|crawler|spider|headless|preview/i.test(navigator.userAgent)) return;

  const session = sessionId();
  if (!session) return;

  const path = (pathname || '/').slice(0, 300);
  const payload = {
    session_id: session,
    path,
    source: sourceHost(),
    device: deviceClass(),
  };

  // Fire and forget: analytics must never break navigation.
  void supabase
    .from('traffic_events')
    .insert(payload)
    .then(
      () => {},
      () => {}
    );
}
