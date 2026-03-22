# VPS Deploy

Current production shape:

- `geocompare` API service on `127.0.0.1:8000`
- `georesolve` API service on `127.0.0.1:8080`
- static frontend served from `/var/www/geocompare-web`
- Caddy routing:
  - `/` -> frontend
  - `/api/*` -> GeoCompare
  - `/georesolve-api/*` -> GeoResolve

Before using the helper scripts, set:

```bash
export REMOTE_HOST=your.server.ip.or.hostname
export REMOTE_USER=your-ssh-user
export PUBLIC_BASE_URL=https://example.yourdomain.com
```

## 1. Frontend only

Deploy the static site:

```bash
npm run deploy:droplet
```

This:

- installs dependencies if needed
- builds the frontend
- uploads `dist/`
- syncs it into `/var/www/geocompare-web`

## 2. Full stack helper

For the current VPS workflow, the most practical entrypoint is:

```bash
npm run deploy:stack
```

That script is in `deploy/deploy-stack.sh`.

Examples:

```bash
npm run deploy:stack
```

```bash
npm run deploy:stack -- --with-sqlite
```

```bash
npm run deploy:stack -- --backend-only
```

```bash
npm run deploy:stack -- --georesolve-only
```

## 3. GeoCompare SQLite rollout

When backend schema/search changes require a fresh SQLite:

1. rebuild on the local machine that has the ACS/source data
2. upload the SQLite artifact
3. replace the live GeoCompare SQLite artifact
4. restart `geocompare.service`

The helper script can do the upload/swap step when called with:

```bash
npm run deploy:stack -- --with-sqlite
```

Defaults used by the helper:

- local SQLite:
  - sibling checkout at `../geocompare/bin/default.sqlite`
- remote live SQLite:
  - `/srv/geocompare/data/default.sqlite`

## 4. Caddy

The current site block should include:

```caddy
example.yourdomain.com {
    encode gzip zstd

    handle_path /georesolve-api/* {
        reverse_proxy 127.0.0.1:8080
    }

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    handle {
        root * /var/www/geocompare-web
        try_files {path} /index.html
        file_server
    }
}
```

Validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 5. Verify

Check:

- `https://example.yourdomain.com/`
- `https://example.yourdomain.com/api/health`
- `https://example.yourdomain.com/georesolve-api/health`

Then test in the UI:

- search
- profile loading
- compare
- ranking
- nearest
- GeoResolve
- map display
- footer `Sources` link

## 6. Rollback

SQLite rollback:

```bash
cp /srv/geocompare/data/default.sqlite.bak /srv/geocompare/data/default.sqlite
sudo systemctl restart geocompare.service
```

Frontend rollback:

- re-deploy an older `dist/` build or check out the prior frontend commit and run `npm run deploy:droplet`
