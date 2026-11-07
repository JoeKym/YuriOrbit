/**
 * Pages Function route: /api/mangadex/*
 *
 * Same-origin MangaDex proxy. The browser calls `/api/mangadex/manga?...`
 * and this handler forwards it to `https://api.mangadex.org/manga?...`.
 *
 * `[[path]]` matches any depth, so `/api/mangadex/at-home/server/<id>`
 * reaches the same handler.
 */
import { handleMangadexProxy } from '../../_lib/mangadex-proxy';

export const onRequest: PagesFunction = async (context) =>
  handleMangadexProxy(context.request, {
    waitUntil: (promise) => context.waitUntil(promise),
  });
