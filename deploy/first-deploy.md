# First Deploy

Recommended first production shape:

- keep the backend API where it is now:
  - `systemd`
  - bound to `127.0.0.1:8000`
- deploy the frontend as static files
- serve both behind the same Caddy site
- proxy `/api/*` from Caddy to the backend

This keeps the browser on one origin and avoids client-side credential handling.

## 1. Build and deploy with one command

From your local repo:

```bash
npm run deploy:droplet
```

That command:

- installs dependencies if needed
- builds the frontend
- uploads `dist/` to the droplet
- syncs it into `/var/www/geocompare-web`

Default deploy target:

- host: `146.190.43.199`
- user: `ian`
- remote temp dir: `/tmp/geocompare-web-dist`
- remote target dir: `/var/www/geocompare-web`

You can override those if needed:

```bash
REMOTE_HOST=146.190.43.199 \
REMOTE_USER=ian \
REMOTE_TARGET_DIR=/var/www/geocompare-web \
npm run deploy:droplet
```

The script assumes:

- your SSH access to the droplet already works
- the remote user can run `sudo rsync` and `sudo mkdir`

## 2. Build the frontend manually

On the server or on your local machine:

```bash
npm install
npm run build
```

The production build uses `/api` by default, so no special frontend API
environment variables are required for the same-origin deploy.

## 3. Copy the static build manually

Create a web root and sync the build:

```bash
sudo mkdir -p /var/www/geocompare-web
sudo rsync -av --delete dist/ /var/www/geocompare-web/
```

If you prefer a one-command local-to-droplet deploy, use:

```bash
npm run deploy:droplet
```

## 4. Update Caddy

Use [Caddyfile.geocompare-web](/Users/iandorsey/dev/geocompare-web/deploy/Caddyfile.geocompare-web)
as the template.

Key points:

- `root * /var/www/geocompare-web`
- `file_server` for the static app
- `try_files {path} /index.html` for SPA behavior
- `reverse_proxy 127.0.0.1:8000` for `/api/*`

Replace the placeholder basic-auth hash with a real bcrypt hash if you want to
keep the full site protected for the first release.

Example hash generation:

```bash
caddy hash-password --plaintext 'YOUR_PASSWORD'
```

Then reload Caddy:

```bash
sudo systemctl reload caddy
```

## 5. Verify

Check:

- `https://geocompare.iandorsey.com/`
- `https://geocompare.iandorsey.com/api/health`
- search in the UI
- a remoteness query
- a local-average query
- detail panel loading after row selection

## 6. Rotate temporary credentials

If you used temporary or shared credentials during setup, rotate them after the
deploy is verified.
