import { useEffect } from 'react';

export interface PageMeta {
  title?: string;
  description?: string;
  /** Absolute or site-relative URL for canonical/og:url hints (optional). */
  path?: string;
  image?: string;
  noIndex?: boolean;
  /** If true, append " — YuriOrbit" only when title doesn't already include it. */
  siteNameSuffix?: boolean;
}

const SITE_NAME = 'YuriOrbit';
const DEFAULT_TITLE = 'YuriOrbit — Your World of Girls\' Love';
const DEFAULT_DESCRIPTION =
  "Discover, track, and enjoy curated Yuri and Girls' Love anime, manga, manhwa, webtoons, light novels, and live-action dramas from around the globe.";
const DEFAULT_IMAGE = '/android-chrome-512x512.png';

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageMeta(meta: PageMeta) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    image = DEFAULT_IMAGE,
    noIndex = false,
    siteNameSuffix = true,
  } = meta;

  useEffect(() => {
    const fullTitle =
      !title
        ? DEFAULT_TITLE
        : siteNameSuffix && !title.includes(SITE_NAME)
          ? `${title} — ${SITE_NAME}`
          : title;

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, fullTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');

    // Twitter
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, fullTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image);

    if (path && typeof window !== 'undefined') {
      const url = new URL(path, window.location.origin).toString();
      upsertMeta('meta[property="og:url"]', { property: 'og:url' }, url);
      upsertMeta('meta[name="twitter:url"]', { name: 'twitter:url' }, url);
      upsertLink('canonical', url);
    }

    return () => {
      // Restore defaults on unmount/navigation to avoid stale metadata between routes
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, path, image, noIndex, siteNameSuffix]);
}

export function PageMeta({ meta }: { meta: PageMeta }) {
  usePageMeta(meta);
  return null;
}
