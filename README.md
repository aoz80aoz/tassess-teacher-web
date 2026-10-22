# حصتي (Hessati) — Teacher web

The web version of the Hessati teacher app (`tassese_teacher`, Flutter): a public, SEO-ready marketing site plus the teacher dashboard behind login. Same backend and same API as the mobile app.

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, TanStack Query.
- **Language:** Arabic only, right to left (`lang="ar" dir="rtl"`), IBM Plex Sans Arabic.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

Other commands: `npm run build`, `npm start`, `npm run lint`, `npx tsc --noEmit`.

### The API

Every page reads and writes through the real backend (`API_BASE_URL`, with `API_KEY`): registration, login and the whole dashboard. There is no dummy data. `Hessati.postman.json` is the API contract: request bodies follow it field for field.

## Environment

| Variable | Where | What |
| --- | --- | --- |
| `API_BASE_URL` | server | e.g. `https://teacher.taseese.org/api` |
| `API_KEY` | server | the backend `x-api-key`; never sent to the browser |
| `NEXT_PUBLIC_SITE_URL` | public | canonical URL, sitemap, Open Graph |
| `NEXT_PUBLIC_FILES_BASE_URL` | public | prefix for `/uploads/...` file paths |
| `NEXT_PUBLIC_GTM_ID` | public | Google Tag Manager container; empty = GTM off |
| `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` | public | store links (footer, phone banner); an AppsFlyer OneLink works here |

`.env.local` is git-ignored. Never commit a real key.

## How it's built

```
src/
  app/
    (marketing)/        public pages: /, /about, /contact, /terms, /privacy  (static, indexable)
    (auth)/             /login, /register (details, school, then OTP, like the app), /forgot-password
    app/                the dashboard (noindex), one folder per screen
    api/backend/[...path]  same-origin proxy for every API call
    api/auth/*          login / register / logout: set or clear the httpOnly cookie
    api/portfolio       read / save the portfolio JSON file
    sitemap.ts robots.ts
  components/ui/        Button, Card/Chip, Dialog, Field, Tabs, Progress, States, Toast, Icon
  features/<area>/      feature components and hooks (auth, classroom, session, run, students, …)
  lib/
    api/endpoints.ts    every backend path (mirror of the app's ApiEndpoints)
    api/types.ts        response shapes
    api/client.ts       api() / apiFile(): unwraps {success, message, errors, data}
    api/hooks.ts        useApiQuery / useApiMutation (TanStack Query, keyed by endpoint)
    strings.ts          every user-facing string (like AppStrings)
    analytics.ts        GTM dataLayer events, Consent Mode, UTM capture
  server/               server-only: config, proxy to the backend, public content
  proxy.ts              guards /app/* (Next 16's replacement for middleware)
```

- **Requests:** the browser calls `/api/backend/<endpoint>`. The server adds `x-api-key` and the teacher's `Authorization: Bearer` token from an httpOnly cookie, so neither ever reaches the browser. A 401 sends the teacher to `/login?next=…`.
- **Cache:** TanStack Query shows the cached copy, then refreshes. A mutation lists the endpoints it makes stale (`invalidates`), which is the web version of the app's `DataChangeBus`.
- **Strings:** no Arabic text in components; it all lives in `src/lib/strings.ts`. The only literals left are API values (the session type).
- **Colors:** tokens in `src/app/globals.css` (`@theme`), the app's `ColorManager` palette. No hex colors in components.

## SEO and marketing

- The landing page's pricing section reads the public catalog (`GET /front/stages`, `/front/classrooms/{stage}`, `/front/subjects/{classroom}`), refreshed hourly; if the API is down, it falls back to a link to registration.
- Marketing pages are static (`○` in the build output). Each has its own title, description and canonical URL, and Open Graph tags. `sitemap.xml` and `robots.txt` are generated; `/app`, `/api` and `/login` are disallowed and the dashboard is `noindex`.
- JSON-LD: `Organization` and `SoftwareApplication` on the landing page. Every public section (catalog numbers, prices, about, contact links) comes from the API.
- **GTM** loads from `NEXT_PUBLIC_GTM_ID`. Every pixel (GA4, Meta, Snapchat, TikTok, Google Ads) is added in GTM, not in code.
- **Consent Mode v2:** everything is denied until the visitor accepts the cookie banner.
- **Events** pushed to `dataLayer` (GA4 names): `page_view` (every route change), `sign_up`, `login`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase` (on the payment result page), `cta_click`. Every event carries the visit's first UTM/click ids (`utm_*`, `gclid`, `fbclid`, `ttclid`, `sccid`).

## Before going live

- Backend: allow the web origin, and add a web return URL for the payment gateway (`/app/subscriptions/result?status=paid|failed`).
- Set `NEXT_PUBLIC_SITE_URL` to the real domain, and add an Open Graph image.
