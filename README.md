# Pencil Admin

The platform console for Pencil staff. Use it to onboard companies, manage plans, features and per-tenant
overrides, suspend or reactivate tenants, and review the cross-tenant audit log.

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · iron-session.
It talks only to the Pencil API's `/api/v1/platform/*` endpoints.

## Run locally

```bash
cp .env.example .env.local    # set SESSION_SECRET (48+ random chars)
npm install
npm run dev                   # http://localhost:3000 (or: npx next dev -p 3001)
```

The API must be running. See `pencil_backend` (`docker compose --profile app up -d`).
The local seed admin is `admin@pencil.local` / `ChangeMe!12345`.

Production build: `npm run build && npm start` (`COOKIE_SECURE=true`, which is also the default in production).

## Security model

| Concern | How it's handled |
|---|---|
| **Tokens** | The browser never sees an API token. Sign-in happens server-side. Access and refresh tokens live in an AES-encrypted (iron-session), `httpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookie. |
| **Data access** | Server Components and Server Actions call the API through `src/lib/dal.ts`, which re-verifies the session on every read and write. There are no client-side API calls. |
| **CSRF** | Writes are Server Actions: POST only, with Next.js checking the request origin. They are combined with SameSite=Strict cookies. |
| **XSS / injection** | Strict per-request nonce CSP (`script-src 'nonce-…' 'strict-dynamic'`, no `unsafe-inline` in production). The UI uses no inline style attributes. |
| **Sessions** | Silent token refresh in `src/proxy.ts` (rotating refresh tokens; parallel refreshes tolerated). There's an idle timeout (`SESSION_IDLE_MINUTES`) and an absolute 12h staff session. Sign-out also revokes the session in the API. Sessions rejected by the API are cleared, never looped. |
| **Headers** | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer`, COOP/CORP `same-origin`, `Permissions-Policy`, HSTS (in production), `Cache-Control: no-store`, `noindex`. |
| **Authorization** | Navigation and actions are filtered by the admin's role permissions. The API enforces the same permissions again. |
| **Reliability** | Tenant onboarding sends an `Idempotency-Key`, so a double submit can't create two companies. |

Cache Components are deliberately **off**: every console page renders per request with the admin's token,
and privileged data is never cached.

## Design

"Graphite on ledger paper." Warm OKLCH neutrals with one signal accent, pencil yellow, used as a
highlighter on the active navigation item, page titles and figures that need attention. Fonts are
Instrument Serif (titles), IBM Plex Sans (UI) and IBM Plex Mono (figures and IDs). Light and dark
themes are server-rendered from a cookie, so there is no flash. Motion is restrained and
`prefers-reduced-motion` is respected. Tokens live in `src/app/globals.css`.

## Structure

```
src/
  proxy.ts            CSP nonce, security headers, session gate, idle timeout, token refresh
  lib/                env (validated), session, api client, dal, permissions, formatting
  components/ui/      primitives (button, field, table, badge…), dialog, charts
  app/login/          sign-in (Server Action)
  app/(console)/      overview, tenants (+ onboarding, detail), plans, features, audit
```
