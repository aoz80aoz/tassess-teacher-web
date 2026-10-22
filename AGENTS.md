<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules (Hessati teacher web)

The web twin of the Flutter app at `../../flutter/tassess-teacher`. Same backend, same endpoints. See `README.md` for the layout.

## Hard rules

- **No user-facing text in components.** Every string goes in `src/lib/strings.ts` (`S.<area>.<key>`). API values (like the session type `"درس جديد"`) are the only exception and must be commented as such.
- **No hex colors in components.** Use the tokens in `src/app/globals.css` (`bg-primary`, `text-muted`, …). Add a token there first.
- **Every backend path comes from `src/lib/api/endpoints.ts`.** Keep it in sync with the app's `ApiEndpoints`.
- **The API key and the auth token never reach the browser.** Browser code calls `api()` (`src/lib/api/client.ts`), which goes through `/api/backend`. Only `src/server/` reads `API_KEY`.
- **Data loading through `useApiQuery` / `useApiMutation`.** A mutation lists the endpoints it makes stale in `invalidates`.
- **Every new endpoint gets a mock handler** in `src/server/mocks/handlers.ts`, returning the real response's shape (check the app's `test/fixtures/api/`).
- **Marketing pages stay static and indexable.** No cookies or per-visitor data in `(marketing)`. The dashboard (`/app`) is `noindex`.
- **Analytics only through `track()`** (`src/lib/analytics.ts`) with GA4 event names. No pixel code in components; pixels are configured in GTM.

## Checks before a commit

`npx tsc --noEmit`, `npm run lint`, `npm run build`.
