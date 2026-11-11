import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Compass,
  Inbox,
  LayoutDashboard,
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

function isTabKey(value: string | null): value is TabKey {
  return !!value && (TAB_KEYS as string[]).includes(value);
}

export function AdminPage() {
  usePageMeta({ title: 'Admin Console', description: 'YuriOrbit admin console.', path: '/admin', noIndex: true });

  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [authorised, setAuthorised] = useState(false);

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

  if (isLoading || checking) {
    return <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">Checking admin access…</div>;
  }

  // Unauthorized — whether not logged in or not an admin — show 404
  if (!isAuthenticated || !authorised) {
    return <NotFoundPage />;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">Admin console</h1>
            <p className="text-xs text-ink-400">
              Signed in as <span className="text-rose-300">{user?.email}</span>
            </p>
          </div>
        </div>
        <Link to="/" className="btn-ghost text-xs">
          <Compass className="h-3.5 w-3.5" /> View site
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-ink-800 pb-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.key;
          return (
            <Link
              key={item.key}
              to={item.key === 'overview' ? '/admin' : `/admin?tab=${item.key}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive ? 'bg-rose-500/15 text-rose-300' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-ink-500 sm:flex">
          <Star className="h-3 w-3" /> Changes are recorded in the audit log
        </span>
      </div>

      {tab === 'overview' && <OverviewTab onNavigate={setTab} />}
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
