import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  clearStoredBlock,
  fetchAccountModeration,
  readStoredBlock,
  writeStoredBlock,
  type StoredBlock,
} from '@/lib/moderation/accountModeration';
import { AccountSuspendedScreen } from '@/components/site/AccountSuspendedScreen';

/** Ban applied → visible quickly; while blocked we poll faster to notice lifts. */
const POLL_MS_ACTIVE = 10_000;
const POLL_MS_BLOCKED = 5_000;

export function AccountModerationGate({ children }: { children: ReactNode }) {
  const { session, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [block, setBlock] = useState<StoredBlock | null>(() => readStoredBlock());
  const wasBlocked = useRef(Boolean(block));

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const moderation = await fetchAccountModeration(session!.access_token);
        if (cancelled) return;

        if (moderation) {
          const saved = writeStoredBlock(moderation);
          wasBlocked.current = true;
          setBlock(saved);
        } else if (wasBlocked.current) {
          // Moderation was lifted: clear the block, end the session and ask the
          // user to sign in again (matching the admin-side flow).
          wasBlocked.current = false;
          clearStoredBlock();
          setBlock(null);
          try {
            await logout();
          } catch {}
          navigate('/auth?moderation=lifted', { replace: true });
          return;
        } else {
          // Verified clean and never blocked in this tab.
          if (readStoredBlock()) clearStoredBlock();
          setBlock(null);
        }
      } catch {
        // Verification failed (network/function/env). Fail open for users with
        // no prior block, but never silently lift a persisted ban.
        if (!cancelled && !wasBlocked.current) setBlock(readStoredBlock());
      } finally {
        if (!cancelled) {
          const delay = wasBlocked.current ? POLL_MS_BLOCKED : POLL_MS_ACTIVE;
          timer = setTimeout(check, delay);
        }
      }
    }

    void check();

    const recheck = () => {
      if (timer) clearTimeout(timer);
      void check();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [isAuthenticated, session?.access_token, logout, navigate]);

  if (block) {
    return (
      <AccountSuspendedScreen
        block={block}
        isAuthenticated={isAuthenticated}
        onSignIn={() => {
          clearStoredBlock();
          setBlock(null);
          navigate('/auth');
        }}
        onSignOut={() => {
          void logout();
        }}
      />
    );
  }

  return <>{children}</>;
}
