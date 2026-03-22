# Daily Ops

Short command reference for the current GeoCompare stack.

## Frontend only

From the `geocompare-web` repo:

```bash
npm run deploy:droplet
```

Required environment:

```bash
export REMOTE_HOST=your.server.ip.or.hostname
export REMOTE_USER=your-ssh-user
```

## Full stack code deploy

From the `geocompare-web` repo:

```bash
npm run deploy:stack
```

## Full stack code deploy plus SQLite swap

From the `geocompare-web` repo:

```bash
npm run deploy:stack -- --with-sqlite
```

## GeoCompare backend only

From the `geocompare-web` repo:

```bash
npm run deploy:stack -- --backend-only
```

## GeoResolve only

From the `geocompare-web` repo:

```bash
npm run deploy:stack -- --georesolve-only
```

## Rebuild GeoCompare SQLite locally

From your `geocompare` checkout:

```bash
source .venv/bin/activate
geocompare build SOURCE_DATA_PATH
```

## Upload rebuilt SQLite only

From the `geocompare-web` repo:

```bash
npm run deploy:stack -- --sqlite-only
```

## Health checks

```bash
curl -i https://example.yourdomain.com/api/health
curl -i https://example.yourdomain.com/georesolve-api/health
```

## Useful service checks on the droplet

```bash
sudo systemctl status geocompare.service --no-pager
sudo systemctl status georesolve.service --no-pager
sudo journalctl -u geocompare.service -n 80 --no-pager
sudo journalctl -u georesolve.service -n 80 --no-pager
```

## SQLite rollback on the droplet

```bash
cp /srv/geocompare/data/default.sqlite.bak /srv/geocompare/data/default.sqlite
sudo systemctl restart geocompare.service
```
