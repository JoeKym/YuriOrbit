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
const SITE_URL = 'https://yuriorbit.pages.dev';
const DEFAULT_TITLE = 'YuriOrbit — Your World of Girls\' Love';
const DEFAULT_DESCRIPTION =
  "Discover, track, and enjoy curated Yuri and Girls' Love anime, manga, manhwa, webtoons, light novels, and live-action dramas from around the globe.";
const DEFAULT_IMAGE = '/android-chrome-512x512.png';

function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return SITE_URL;
}

function toAbsoluteUrl(value: string | undefined, base?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base || siteOrigin()).toString();
  } catch {
    return value;
  }
}

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

    const origin = siteOrigin();
    const url = toAbsoluteUrl(path, origin);
    const imageUrl = toAbsoluteUrl(image, origin) || toAbsoluteUrl(DEFAULT_IMAGE, origin)!;

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, noIndex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, fullTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'en_US');

    // Twitter
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, fullTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);

    if (url) {
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
