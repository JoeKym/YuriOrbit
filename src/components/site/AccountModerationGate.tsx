import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Scale } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

type Moderation = { action?: string; reason?: string; expiresAt?: string | null } | null;

type StoredBlock = {
  action: string;
  reason: string;
  expiresAt: string | null;
  at: string;
};

const BLOCK_STORAGE_KEY = 'yuriorbit_account_block';
const ALLOWED_PREFIXES = ['/appeals', '/contact', '/feedback', '/faq', '/terms', '/privacy', '/auth'];

function readStoredBlock(): StoredBlock | null {
  try {
    const raw = localStorage.getItem(BLOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBlock;
    if (!parsed || !parsed.action) return null;
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(BLOCK_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredBlock(moderation: Moderation): StoredBlock | null {
  if (!moderation?.action) return null;
  const block: StoredBlock = {
    action: moderation.action,
    reason: moderation.reason || '',
    expiresAt: moderation.expiresAt || null,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(block));
  } catch {}
  return block;
}

function clearStoredBlock() {
  try {
    localStorage.removeItem(BLOCK_STORAGE_KEY);
  } catch {}
}

function BlockedScreen({ block, onRetry }: { block: StoredBlock; onRetry: () => void }) {
  const isBan = block.action === 'ban';
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
          ? 'This account has been banned and cannot use YuriOrbit.'
          : 'This account is temporarily suspended and cannot use YuriOrbit right now.'}
      </p>
      {block.reason ? <p className="mt-2 text-xs text-ink-400">Reason: {block.reason}</p> : null}
      {block.expiresAt && !isBan ? (
        <p className="mt-1 text-xs text-ink-500">Until: {new Date(block.expiresAt).toLocaleString()}</p>
      ) : null}
      <p className="mt-4 text-xs text-ink-400">
        You have been signed out. If you believe this is a mistake, submit an appeal.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/appeals" className="btn-primary"><Scale className="h-4 w-4" /> Submit appeal</Link>
        <Link to="/contact" className="btn-secondary">Contact</Link>
        <button type="button" onClick={onRetry} className="btn-ghost">
          <LogOut className="h-4 w-4" /> Sign in with another account
        </button>
      </div>
    </div>
  );
}

export function AccountModerationGate({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [block, setBlock] = useState<StoredBlock | null>(null);
  const [recheck, setRecheck] = useState(0);
  const revoking = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isAuthenticated || !session?.access_token) {
        // Signed out: honour any block saved when the account was cut off.
        if (!cancelled) setBlock(readStoredBlock());
        return;
      }

      try {
        const res = await fetch('/api/account', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json().catch(() => null)) as { moderation?: Moderation } | null;
        const moderation = data?.moderation ?? null;
        if (cancelled) return;

        if (moderation) {
          const saved = writeStoredBlock(moderation);
          setBlock(saved);
          // Ban/suspension must not keep an active session usable: revoke it now.
          if (!revoking.current) {
            revoking.current = true;
            try {
              await logout();
            } catch {}
            revoking.current = false;
          }
        } else {
          // Verified clean (e.g. after an unban and fresh sign-in).
          clearStoredBlock();
          setBlock(null);
        }
      } catch {
        // Verification unavailable: fail open for normal users, but keep an
        // existing persisted block so a ban is never silently lifted.
        if (!cancelled) setBlock((current) => current ?? readStoredBlock());
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session?.access_token, location.pathname, logout, recheck]);

  // Re-check when the tab regains focus, so a ban applied mid-session is caught.
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => setRecheck((n) => n + 1);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAuthenticated]);

  const allowed = ALLOWED_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );

  if (block) {
    // Appeals/contact remain reachable so a moderated user can respond.
    if (allowed) return <>{children}</>;
    return (
      <BlockedScreen
        block={block}
        onRetry={() => {
          clearStoredBlock();
          setBlock(null);
          navigate('/auth');
        }}
      />
    );
  }

  return <>{children}</>;
}
