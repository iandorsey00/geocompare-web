#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-146.190.43.199}"
REMOTE_USER="${REMOTE_USER:-ian}"
SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"

WEB_TARGET_DIR="${WEB_TARGET_DIR:-/var/www/geocompare-web}"
GEOCOMPARE_REMOTE_DIR="${GEOCOMPARE_REMOTE_DIR:-/home/ian/geocompare/app}"
GEORESOLVE_REMOTE_DIR="${GEORESOLVE_REMOTE_DIR:-/home/ian/georesolve/app}"

GEOCOMPARE_SERVICE="${GEOCOMPARE_SERVICE:-geocompare.service}"
GEORESOLVE_SERVICE="${GEORESOLVE_SERVICE:-georesolve.service}"

LOCAL_GEOCOMPARE_REPO="${LOCAL_GEOCOMPARE_REPO:-/Users/iandorsey/dev/geocompare}"
LOCAL_GEOCOMPARE_SQLITE_PATH="${LOCAL_GEOCOMPARE_SQLITE_PATH:-/Users/iandorsey/dev/geocompare/bin/default.sqlite}"
REMOTE_GEOCOMPARE_SQLITE_PATH="${REMOTE_GEOCOMPARE_SQLITE_PATH:-/home/ian/geocompare/data/default.sqlite}"
REMOTE_SQLITE_TMP_PATH="${REMOTE_SQLITE_TMP_PATH:-/tmp/default.sqlite}"

RUN_WEB=1
RUN_GEOCOMPARE=1
RUN_GEORESOLVE=1
RUN_SQLITE=0

usage() {
  cat <<'EOF'
Usage: bash ./deploy/deploy-stack.sh [options]

Options:
  --web-only             Deploy only geocompare-web static files
  --backend-only         Deploy only geocompare backend code and restart service
  --georesolve-only      Deploy only georesolve code and restart service
  --sqlite-only          Upload/swap only the GeoCompare SQLite artifact and restart backend
  --with-sqlite          Include SQLite upload/swap in a normal stack deploy
  --skip-web             Skip static frontend deploy
  --skip-backend         Skip geocompare backend code deploy
  --skip-georesolve      Skip georesolve code deploy
  -h, --help             Show this help

Environment overrides:
  REMOTE_HOST, REMOTE_USER
  WEB_TARGET_DIR
  GEOCOMPARE_REMOTE_DIR, GEORESOLVE_REMOTE_DIR
  GEOCOMPARE_SERVICE, GEORESOLVE_SERVICE
  LOCAL_GEOCOMPARE_REPO, LOCAL_GEOCOMPARE_SQLITE_PATH
  REMOTE_GEOCOMPARE_SQLITE_PATH, REMOTE_SQLITE_TMP_PATH
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only)
      RUN_WEB=1
      RUN_GEOCOMPARE=0
      RUN_GEORESOLVE=0
      RUN_SQLITE=0
      ;;
    --backend-only)
      RUN_WEB=0
      RUN_GEOCOMPARE=1
      RUN_GEORESOLVE=0
      RUN_SQLITE=0
      ;;
    --georesolve-only)
      RUN_WEB=0
      RUN_GEOCOMPARE=0
      RUN_GEORESOLVE=1
      RUN_SQLITE=0
      ;;
    --sqlite-only)
      RUN_WEB=0
      RUN_GEOCOMPARE=0
      RUN_GEORESOLVE=0
      RUN_SQLITE=1
      ;;
    --with-sqlite)
      RUN_SQLITE=1
      ;;
    --skip-web)
      RUN_WEB=0
      ;;
    --skip-backend)
      RUN_GEOCOMPARE=0
      ;;
    --skip-georesolve)
      RUN_GEORESOLVE=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

deploy_web() {
  echo
  echo "==> Deploying geocompare-web"
  REMOTE_HOST="$REMOTE_HOST" REMOTE_USER="$REMOTE_USER" REMOTE_TARGET_DIR="$WEB_TARGET_DIR" \
    bash "$ROOT_DIR/deploy/deploy-static.sh"
}

deploy_geocompare_code() {
  echo
  echo "==> Updating geocompare backend code on droplet"
  ssh -t "$SSH_TARGET" "cd '$GEOCOMPARE_REMOTE_DIR' && git pull && source .venv/bin/activate && pip install -e . && sudo systemctl restart '$GEOCOMPARE_SERVICE' && sudo systemctl status '$GEOCOMPARE_SERVICE' --no-pager"
}

deploy_georesolve_code() {
  echo
  echo "==> Updating georesolve code on droplet"
  ssh -t "$SSH_TARGET" "cd '$GEORESOLVE_REMOTE_DIR' && git pull && source .venv/bin/activate && pip install -e '.[web]' && sudo systemctl restart '$GEORESOLVE_SERVICE' && sudo systemctl status '$GEORESOLVE_SERVICE' --no-pager"
}

deploy_sqlite() {
  echo
  echo "==> Uploading GeoCompare SQLite artifact"
  rsync -avz --progress "$LOCAL_GEOCOMPARE_SQLITE_PATH" "$SSH_TARGET:$REMOTE_SQLITE_TMP_PATH"
  echo
  echo "==> Swapping live GeoCompare SQLite on droplet"
  ssh -t "$SSH_TARGET" "cp '$REMOTE_GEOCOMPARE_SQLITE_PATH' '${REMOTE_GEOCOMPARE_SQLITE_PATH}.bak' && cp '$REMOTE_SQLITE_TMP_PATH' '$REMOTE_GEOCOMPARE_SQLITE_PATH' && sudo systemctl restart '$GEOCOMPARE_SERVICE' && sudo systemctl status '$GEOCOMPARE_SERVICE' --no-pager"
}

if [[ "$RUN_WEB" -eq 1 ]]; then
  deploy_web
fi

if [[ "$RUN_GEOCOMPARE" -eq 1 ]]; then
  deploy_geocompare_code
fi

if [[ "$RUN_GEORESOLVE" -eq 1 ]]; then
  deploy_georesolve_code
fi

if [[ "$RUN_SQLITE" -eq 1 ]]; then
  deploy_sqlite
fi

echo
echo "Done."
echo "Suggested checks:"
echo "  https://geocompare.iandorsey.com/"
echo "  https://geocompare.iandorsey.com/api/health"
echo "  https://geocompare.iandorsey.com/georesolve-api/health"
