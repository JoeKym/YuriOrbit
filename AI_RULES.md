# Tech Stack
- React with TypeScript
- React Router (routes kept in src/App.tsx)
- Tailwind CSS for styling
- shadcn/ui component library (pre-built components)
- Lucide React for icons
- Vite as build tool
- No server layer unless enabled via enable_nitro
- Source code in src folder, pages in src/pages/, components in src/components/
- Main page is src/pages/Index.tsx

# Library Usage Rules
- Use shadcn/ui components whenever possible; do not edit them directly, create new components if modifications are needed.
- Use Tailwind utility classes for layout, spacing, colors, and other design aspects.
- Use lucide-react icons for all icon needs.
- Keep routing configuration in src/App.tsx using React Router.
- Place page components under src/pages/ and reusable UI components under src/components/.
- Always import from shadcn/ui library; avoid reinventing basic UI elements.
- Use TypeScript strictly; enable strict mode.
- Do not add extra state management libraries unless necessary; prefer React Context or hooks.
- Keep file sizes small; prefer small, focused components.

<!-- nitro:start -->

## Nitro Server Layer

This project has a Nitro server layer for backend API routes. A `nitro.config.ts` at the app root sets `serverDir: "./server"` — do not move or remove it.

### vite.config.ts

`vite.config.ts` already imports `nitro` from `"nitro/vite"` and registers `nitro()` as the LAST entry in the `plugins` array. Do not move it earlier — it must run after Vite's module-transform middleware, otherwise Nitro's SPA fallback intercepts Vite internal URLs (`/src/*.tsx`, `/@vite/client`, `/@react-refresh`, `/@fs/*`) and returns `index.html`, breaking the preview.

### API Route Conventions

- Write routes in `server/routes/api/` (NEVER top-level `/api/`).
- Dynamic routes: `[param].ts`. Method-specific: `hello.get.ts`, `hello.post.ts`.
- Runtime config: `useRuntimeConfig()` (env vars prefixed with `NITRO_`).

### Imports — read carefully

Imports come from two different sources:

- `defineHandler` and `useRuntimeConfig` are imported from **`"nitro"`**.
- **Every request/response helper comes from `"nitro/h3"`** — Nitro v3 re-exports h3 utilities through that subpath. Common ones: `readBody`, `readValidatedBody`, `getQuery`, `getRouterParam`, `getRouterParams`, `createError`, `sendError`, `setResponseStatus`, `getRequestHeaders`, `getRequestURL`, `setCookie`, `getCookie`, `deleteCookie`.

Worked example — `server/routes/api/todos.post.ts`:

```ts
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

export default defineHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event);
  if (!body?.title) {
    throw createError({ statusCode: 400, statusMessage: "title is required" });
  }
  return { ok: true, title: body.title };
});
```

### Server-side packages

Any package used inside `server/` (database drivers like `@neondatabase/serverless`, auth SDKs, third-party API clients) must be in `package.json`. Add it before writing the first server file that imports it. NEVER import these from `src/` — code under `src/` ships to the browser, so importing server packages there leaks them and usually breaks the build.

### Common mistakes

- `import { readBody } from "nitro"` → wrong. h3 utilities are not exported from `"nitro"`. Use `"nitro/h3"`.
- `import { readBody } from "h3"` → wrong. Even though Nitro is built on h3, you import through `"nitro/h3"` (the version Nitro re-exports), not `"h3"` directly.
- `nitro()` placed before `react()` in `plugins` → wrong. Must be the LAST entry, otherwise the SPA fallback intercepts Vite internals.
- Omitting `nitro()` from `vite.config.ts` entirely → `/api/*` returns `index.html` instead of JSON.
- Importing server-only packages or referencing server-only env vars (`process.env.DATABASE_URL`, secrets) from `src/` → wrong. The Vite client bundle is public; this leaks them. Server code lives in `server/` only.

<!-- nitro:end -->
