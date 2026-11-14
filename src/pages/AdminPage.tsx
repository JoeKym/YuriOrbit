import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Compass,
  Inbox,
  LayoutDashboard,
  Loader2,
  Mail,
  ListChecks,
  Megaphone,
  Shield,
  Link2,
  BadgeCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useAuth } from '@/lib/auth/AuthContext';
import { adminApi } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { LibraryTab } from '@/components/admin/LibraryTab';
import { SlugRedirectsTab } from '@/components/admin/SlugRedirectsTab';
import { GLOverridesTab } from '@/components/admin/GLOverridesTab';
import { FeaturedTab } from '@/components/admin/FeaturedTab';
import { SiteSettingsTab } from '@/components/admin/SiteSettingsTab';
import { AuditTab } from '@/components/admin/AuditTab';
import { FeedbackTab } from '@/components/admin/FeedbackTab';
import { TrafficTab } from '@/components/admin/TrafficTab';
import { AppealsTab } from '@/components/admin/AppealsTab';
import { ContentModerationTab } from '@/components/admin/ContentModerationTab';
import { ReviewsTab } from '@/components/admin/ReviewsTab';
import { BarChart3, Scale, ShieldAlert, Quote } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonClasses } from '@/components/ui';

type TabKey = 'overview' | 'traffic' | 'users' | 'appeals' | 'moderation' | 'reviews' | 'library' | 'redirects' | 'gl-overrides' | 'feedback' | 'contact' | 'featured' | 'settings' | 'audit';

const TABS: { key: TabKey; label: string; icon: typeof Shield }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'traffic', label: 'Traffic', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'appeals', label: 'Appeals', icon: Scale },
  { key: 'moderation', label: 'Content moderation', icon: ShieldAlert },
  { key: 'reviews', label: 'Reviews', icon: Quote },
  { key: 'library', label: 'Library', icon: ListChecks },
  { key: 'redirects', label: 'Slug redirects', icon: Link2 },
  { key: 'gl-overrides', label: 'GL overrides', icon: BadgeCheck },
  { key: 'feedback', label: 'Feedback', icon: Inbox },
  { key: 'contact', label: 'Contact', icon: Mail },
  { key: 'featured', label: "Editor's Picks", icon: Sparkles },
  { key: 'settings', label: 'Site settings', icon: Megaphone },
  { key: 'audit', label: 'Audit log', icon: Activity },
];

const TAB_KEYS = TABS.map((item) => item.key);

/** Sections grouped so fourteen destinations read as five areas. */
const TAB_GROUPS: { label: string; keys: TabKey[] }[] = [
  { label: 'General', keys: ['overview'] },
  { label: 'People', keys: ['users', 'appeals'] },
  { label: 'Catalogue', keys: ['library', 'reviews', 'moderation', 'featured', 'redirects', 'gl-overrides'] },
  { label: 'Inbox', keys: ['feedback', 'contact'] },
  { label: 'System', keys: ['traffic', 'settings', 'audit'] },
];

const TAB_BY_KEY = new Map(TABS.map((item) => [item.key, item]));

function isTabKey(value: string | null): value is TabKey {
  return !!value && (TAB_KEYS as string[]).includes(value);
}

export function AdminPage() {
  usePageMeta({ title: 'Admin Console', description: 'YuriOrbit admin console.', path: '/admin', noIndex: true });

  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [authorised, setAuthorised] = useState(false);
  const [queueCounts, setQueueCounts] = useState<Partial<Record<TabKey, number>>>({});
  const stripRef = useRef<HTMLDivElement>(null);

  // Tabs live in the URL: /admin?tab=users, /admin?tab=featured, …
  const requested = searchParams.get('tab');
  const tab: TabKey = isTabKey(requested) ? requested : 'overview';

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'overview') next.delete('tab');
    else next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setChecking(false);
      setAuthorised(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    adminApi.me().then((result) => {
      if (cancelled) return;
      setAuthorised(Boolean(result.ok && result.data));
      setChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  // How much work each queue holds, so the tabs and the overview agree.
  const loadQueueCounts = useCallback(async () => {
    const [appeals, inbox, contact, settings] = await Promise.all([
      adminApi.feedback({ kind: 'appeal', status: 'open', perPage: 1 }),
      adminApi.feedback({ status: 'open', perPage: 1 }),
      adminApi.feedback({ kind: 'contact', status: 'open', perPage: 1 }),
      adminApi.settings(),
    ]);

    const moderationRow = settings.ok
      ? settings.data?.settings.find((row) => row.key === 'content_moderation')
      : undefined;
    const moderationValue = moderationRow?.value;
    const moderationCount =
      moderationValue && typeof moderationValue === 'object'
        ? Object.keys(moderationValue as Record<string, unknown>).length
        : 0;

    setQueueCounts({
      appeals: appeals.ok ? appeals.data?.total ?? 0 : undefined,
      feedback: inbox.ok ? inbox.data?.total ?? 0 : undefined,
      contact: contact.ok ? contact.data?.total ?? 0 : undefined,
      moderation: moderationCount,
    });
  }, []);

  useEffect(() => {
    if (!authorised) return;
    void loadQueueCounts();
  }, [authorised, loadQueueCounts]);

  // A deep link can open a tab that starts outside the scrolling strip.
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !active) return;
    const stripRect = strip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left < stripRect.left) {
      strip.scrollLeft -= stripRect.left - activeRect.left + 12;
    } else if (activeRect.right > stripRect.right) {
      strip.scrollLeft += activeRect.right - stripRect.right + 12;
    }
  }, [tab, authorised]);

  if (isLoading || checking) {
    return (
      <div
        role="status"
        className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-sm text-ink-300 md:px-6"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Checking admin access…
      </div>
    );
  }

  // Unauthorized — whether not logged in or not an admin — show 404
  if (!isAuthenticated || !authorised) {
    return <NotFoundPage />;
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <PageHeader
            variant="compact"
            eyebrow="Operations"
            title="Admin console"
            description={
              <>
                Signed in as <span className="text-rose-300">{user?.email}</span>
              </>
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-micro text-ink-400 sm:flex">
            <Star className="h-3 w-3" /> Changes are recorded in the audit log
          </span>
          <Link to="/" className={buttonClasses('ghost', 'sm')}>
            <Compass className="h-3.5 w-3.5" /> View site
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div
          ref={stripRef}
          className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <nav
            aria-label="Admin sections"
            className="flex w-max items-center gap-3 border-b border-ink-800 pb-3"
          >
            {TAB_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                role="group"
                aria-label={group.label}
                className="flex items-center gap-1.5"
              >
                <span className="pr-0.5 text-micro font-semibold uppercase tracking-[0.14em] text-ink-500">
                  {group.label}
                </span>
                {group.keys.map((key) => {
                  const item = TAB_BY_KEY.get(key);
                  if (!item) return null;
                  const Icon = item.icon;
                  const isActive = tab === key;
                  const count = queueCounts[key];
                  return (
                    <Link
                      key={key}
                      to={key === 'overview' ? '/admin' : `/admin?tab=${key}`}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                      {typeof count === 'number' && count > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-micro font-semibold leading-none',
                            isActive ? 'bg-rose-500/25 text-rose-100' : 'bg-ink-700/60 text-ink-200'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {groupIndex < TAB_GROUPS.length - 1 && (
                  <span aria-hidden="true" className="ml-2 h-4 w-px bg-ink-800" />
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {tab === 'overview' && (
        <OverviewTab onNavigate={setTab} counts={queueCounts} onRefreshCounts={loadQueueCounts} />
      )}
      {tab === 'traffic' && <TrafficTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'appeals' && <AppealsTab />}
      {tab === 'moderation' && <ContentModerationTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'library' && <LibraryTab />}
      {tab === 'redirects' && <SlugRedirectsTab />}
      {tab === 'gl-overrides' && <GLOverridesTab />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'contact' && <FeedbackTab mode="contact" />}
      {tab === 'featured' && <FeaturedTab />}
      {tab === 'settings' && <SiteSettingsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
