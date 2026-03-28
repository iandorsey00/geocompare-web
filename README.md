# GeoCompare Web

Web frontend for exploring GeoCompare and GeoResolve.

## What it does

- search geographies
- open demographic profiles
- compare multiple geographies
- run ranking queries
- run nearest-geography queries
- resolve addresses, coordinates, coordinate-bearing map URLs, and current location through GeoResolve
- show boundaries on a map for supported geographies
- show built-in data sources through the app footer

The frontend treats both backends as external services:

- `GeoCompare` for profiles, ranking, nearest, and search
- `GeoResolve` for address-to-geography resolution

## Stack

- Vite
- React 18
- TypeScript
- plain CSS
- Leaflet for map display

## Current structure

```text
src/
  components/
    ComparePanel.tsx
    DetailPanel.tsx
    GeoResolvePanel.tsx
    MapPanel.tsx
    NearestPanel.tsx
    ResultsTable.tsx
    SearchPanel.tsx
    SectionCard.tsx
    TopBottomPanel.tsx
  lib/
    api.ts
    boundaries.ts
    format.ts
    geo-options.ts
    types.ts
  styles/
    app.css
  App.tsx
  main.tsx
deploy/
  Caddyfile.geocompare-web
  deploy-static.sh
  deploy-stack.sh
  first-deploy.md
```

## Environment

Copy `.env.example` to `.env.local` if you want local overrides.

Example local proxy settings:

```bash
VITE_GEOCOMPARE_API_BASE_URL=/api
VITE_GEORESOLVE_API_BASE_URL=/georesolve-api
GEOCOMPARE_PROXY_TARGET=https://example.yourdomain.com
GEOCOMPARE_PROXY_AUTH_USERNAME=
GEOCOMPARE_PROXY_AUTH_PASSWORD=
```

Keep browser-facing auth empty. If you need credentials in local development, put them on the Vite dev proxy side only so they are not bundled into client JavaScript.

For same-origin deployment behind Caddy, the frontend should keep using:

- `/api`
- `/georesolve-api`

## Development

Install Node.js 20+ first, then:

```bash
npm install
npm run dev
npm test
```

## Deploy

### Static frontend only

```bash
npm run deploy:droplet
```

That builds the app and syncs `dist/` to:

- `/var/www/geocompare-web`

Set these first:

```bash
export REMOTE_HOST=your.server.ip.or.hostname
export REMOTE_USER=your-ssh-user
```

### Full stack helper

```bash
npm run deploy:stack
```

This script lives in `deploy/deploy-stack.sh` and is intended as an operator-facing entrypoint for the current VPS setup.

It can:

- deploy the frontend
- update `geocompare` on the droplet
- update `georesolve` on the droplet
- optionally upload/swap the GeoCompare SQLite artifact

Examples:

```bash
npm run deploy:stack
```

```bash
npm run deploy:stack -- --with-sqlite
```

```bash
npm run deploy:stack -- --web-only
```

## Production shape

Current recommended shape:

- `geocompare` API on `127.0.0.1:8000`
- `georesolve` API on `127.0.0.1:8080`
- static frontend served from `/var/www/geocompare-web`
- Caddy serving:
  - `/` -> frontend
  - `/api/*` -> GeoCompare
  - `/georesolve-api/*` -> GeoResolve

See:

- `deploy/first-deploy.md`
- `deploy/daily-ops.md`

## Notes

- Search hides census tracts by default, but users can opt in.
- GeoResolve uses one freeform `query` input and accepts addresses, raw lat/lon, and map URLs only when coordinates are present.
- GeoResolve current-location lookup uses the browser geolocation API and `/resolve-current-location`.
- GeoResolve profile opening is GEOID-first.
- Compare currently stays table-first; maps are shown on single-profile views only.
- The footer `Sources` link shows the built-in GeoCompare source list from the backend.
- The footer `API` link shows the current web/API version context and the live GET-style query endpoints used by GeoCompare and GeoResolve.
- The current bundle is larger than ideal because of map support and static option data. Lazy loading would be a good future cleanup.

## Security note

- The docs and deploy scripts are written as templates now, but review Git history before making a repo public.
- Hostnames, usernames, server paths, and prior deployment details are operational metadata, even when they are not secrets.
