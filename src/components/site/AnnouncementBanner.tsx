import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';

const DISMISS_KEY = 'yuriorbit:announcement_dismissed';

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      // ignore storage restrictions
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'announcement')
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data?.value) return;
        const value = data.value as Announcement;
        if (value && value.active && value.text) setAnnouncement(value);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement || dismissed || !announcement.text) return null;

  const tone =
    announcement.tone === 'warning'
      ? 'border-warning-500/30 bg-warning-500/10 text-warning-300'
      : announcement.tone === 'success'
        ? 'border-success-500/30 bg-success-500/10 text-success-300'
        : 'border-rose-500/25 bg-rose-500/10 text-rose-200';

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const isExternal = /^https?:\/\//i.test(announcement.linkHref || '');

  return (
    <div className={cn('border-b px-4 py-2 text-xs', tone)}>
      <div className="mx-auto flex max-w-page items-center gap-2.5">
        <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
        <p className="flex-1">{announcement.text}</p>
        {announcement.linkLabel && announcement.linkHref && (
          isExternal ? (
            <a
              href={announcement.linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden font-medium underline sm:inline"
            >
              {announcement.linkLabel}
            </a>
          ) : (
            <Link to={announcement.linkHref} className="hidden font-medium underline sm:inline">
              {announcement.linkLabel}
            </Link>
          )
        )}
        <button onClick={handleDismiss} aria-label="Dismiss announcement" className="rounded p-1 hover:bg-black/20">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
