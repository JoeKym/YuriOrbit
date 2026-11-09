import { handleAnilistProxy } from '../../_lib/anilist-proxy';

/**
 * Same-origin, edge-cached AniList endpoint. The browser posts GraphQL here
 * instead of to graphql.anilist.co, so every visitor shares one cached response
 * per query instead of each making their own upstream call.
 */
export const onRequest: PagesFunction = async (context) =>
  handleAnilistProxy(context.request, {
    waitUntil: (promise) => context.waitUntil(promise),
  });
