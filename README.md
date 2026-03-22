# GeoCompare Web

Lightweight frontend for exploring the GeoCompare API.

## Recommended stack

- Vite
- React 18
- TypeScript
- Plain CSS for a small MVP without a styling framework

This keeps the first version fast to iterate on, while leaving a clean path to
add Leaflet and tract-boundary rendering later.

## Current structure

```text
src/
  components/
    ApiSettingsPanel.tsx
    DetailPanel.tsx
    QueryPanel.tsx
    ResultsTable.tsx
    SearchPanel.tsx
    SectionCard.tsx
  lib/
    api.ts
    format.ts
    types.ts
  styles/
    app.css
  App.tsx
  main.tsx
```

## Environment

Copy `.env.example` to `.env.local` and fill in credentials if needed:

```bash
VITE_GEOCOMPARE_API_BASE_URL=/api
VITE_GEOCOMPARE_AUTH_USERNAME=
VITE_GEOCOMPARE_AUTH_PASSWORD=
GEOCOMPARE_PROXY_TARGET=https://geocompare.iandorsey.com
GEOCOMPARE_PROXY_AUTH_USERNAME=
GEOCOMPARE_PROXY_AUTH_PASSWORD=
```

The app also lets you change the base URL and basic-auth credentials in the UI.
Those settings are persisted in local storage so local development stays easy.

For local development against the current protected backend, the smoothest path
is:

- leave `VITE_GEOCOMPARE_API_BASE_URL=/api`
- set `GEOCOMPARE_PROXY_TARGET` to the live API origin
- set proxy auth credentials in `.env.local`

That lets the Vite dev server forward requests to the live backend without
browser CORS trouble. Later, when the frontend is deployed behind the same
origin, keep using `/api` and remove the dev-only proxy settings.

## Development

Install Node.js 20+ first, then:

```bash
npm install
npm run dev
```

## First production deploy

Recommended first deploy shape:

- build the app to static files
- serve it from the same Caddy site as the API
- proxy `/api/*` to the existing backend on `127.0.0.1:8000`

That avoids browser CORS trouble and means the frontend can keep using `/api`
without embedding backend credentials in the client.

Deployment files:

- [deploy/Caddyfile.geocompare-web](/Users/iandorsey/dev/geocompare-web/deploy/Caddyfile.geocompare-web)
- [deploy/deploy-static.sh](/Users/iandorsey/dev/geocompare-web/deploy/deploy-static.sh)
- [deploy/first-deploy.md](/Users/iandorsey/dev/geocompare-web/deploy/first-deploy.md)

One-command droplet deploy:

```bash
npm run deploy:droplet
```

Defaults:

- `REMOTE_HOST=146.190.43.199`
- `REMOTE_USER=ian`
- `REMOTE_TARGET_DIR=/var/www/geocompare-web`

## MVP coverage

- Search box for `/search`
- Remoteness query form for `/remoteness`
- Local-average query form for `/local-average`
- Result table with selection state
- Detail panel loading `/profile`
- Configurable API base URL
- Basic-auth-ready client layer for the current Caddy setup
- Vite dev proxy support for the current remote protected deployment

## Notes for next iteration

- Add a map pane once tract geometry is available from the backend or a sidecar
  service.
- Keep selection state centralized so both the detail panel and future map can
  react to the same chosen geography.
- If the frontend is deployed behind the same origin later, leave credentials
  blank and point the base URL to the proxy path.
