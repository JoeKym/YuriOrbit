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

/**
 * Frequent enough that a ban appears (and a lift is noticed) within a few
 * seconds, like the admin console implies. The check is one small Supabase
 * read, and it is skipped while the tab is hidden.
 */
const POLL_MS = 5_000;

export function AccountModerationGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [block, setBlock] = useState<StoredBlock | null>(() => readStoredBlock());
  const wasBlocked = useRef(Boolean(block));

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(check, POLL_MS);
        return;
      }
      try {
        const moderation = await fetchAccountModeration(user!.id);
        if (cancelled) return;

        if (moderation) {
          wasBlocked.current = true;
          setBlock(writeStoredBlock(moderation));
        } else if (wasBlocked.current) {
          // Moderation was lifted: clear the block, end the session and send
          // the user back to sign in again.
          wasBlocked.current = false;
          clearStoredBlock();
          setBlock(null);
          try {
            await logout();
          } catch {}
          navigate('/auth?moderation=lifted', { replace: true });
          return;
        } else {
          if (readStoredBlock()) clearStoredBlock();
          setBlock(null);
        }
      } catch {
        // Could not read the state (offline, RLS, etc.). Never lift a block
        // because of an error; for clean users just carry on.
        if (!cancelled && !wasBlocked.current) setBlock(readStoredBlock());
      } finally {
        if (!cancelled) timer = setTimeout(check, POLL_MS);
      }
    }

    void check();

    // Check immediately when the user comes back to the tab.
    const recheck = () => {
      if (document.visibilityState === 'hidden') return;
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
  }, [isAuthenticated, user?.id, logout, navigate]);

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
