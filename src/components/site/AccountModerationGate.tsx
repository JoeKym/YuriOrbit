import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, LogOut, Scale } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

type Moderation = { action?: string; reason?: string; expiresAt?: string | null } | null;

const ALLOWED_PREFIXES = ['/appeals', '/contact', '/feedback', '/faq', '/terms', '/privacy', '/auth'];

export function AccountModerationGate({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [moderation, setModeration] = useState<Moderation>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!isAuthenticated || !session?.access_token) {
        if (!cancelled) { setModeration(null); setChecked(true); }
        return;
      }
      try {
        const res = await fetch('/api/account', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const data = (await res.json().catch(() => null)) as { moderation?: Moderation } | null;
        if (!cancelled) setModeration(data?.moderation ?? null);
      } catch {
        if (!cancelled) setModeration(null); // fail open
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [isAuthenticated, session?.access_token, location.pathname]);

  const allowed = ALLOWED_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  if (!checked || !moderation || allowed) return <>{children}</>;

  const isBan = moderation.action === 'ban';
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-error-500/30 bg-error-500/10">
        <AlertTriangle className="h-7 w-7 text-error-400" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink-50">
        {isBan ? 'Account banned' : 'Account suspended'}
      </h1>
      <p className="mt-3 text-sm text-ink-300">
        {isBan
          ? 'Your account has been banned and cannot use YuriOrbit right now.'
          : 'Your account is temporarily suspended and cannot use YuriOrbit right now.'}
      </p>
      {moderation.reason ? <p className="mt-2 text-xs text-ink-400">Reason: {moderation.reason}</p> : null}
      {moderation.expiresAt && !isBan ? (
        <p className="mt-1 text-xs text-ink-500">Until: {new Date(moderation.expiresAt).toLocaleString()}</p>
      ) : null}
      <p className="mt-4 text-xs text-ink-400">
        If you believe this is a mistake, you can submit an appeal. You can also sign out.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/appeals" className="btn-primary"><Scale className="h-4 w-4" /> Submit appeal</Link>
        <Link to="/contact" className="btn-secondary">Contact</Link>
        <button onClick={() => void logout()} className="btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}
