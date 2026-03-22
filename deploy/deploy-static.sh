#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-}"
REMOTE_TMP_DIR="${REMOTE_TMP_DIR:-/tmp/geocompare-web-dist}"
REMOTE_TARGET_DIR="${REMOTE_TARGET_DIR:-/var/www/geocompare-web}"

if [[ -z "$REMOTE_HOST" || -z "$REMOTE_USER" ]]; then
  echo "Set REMOTE_HOST and REMOTE_USER before running deploy-static.sh." >&2
  exit 1
fi

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"

npm install
npm run build
rsync -av --delete dist/ "${SSH_TARGET}:${REMOTE_TMP_DIR}/"
ssh -t "$SSH_TARGET" "sudo mkdir -p '${REMOTE_TARGET_DIR}' && sudo rsync -av --delete '${REMOTE_TMP_DIR}/' '${REMOTE_TARGET_DIR}/'"

echo "Deployed dist/ to ${SSH_TARGET}:${REMOTE_TARGET_DIR}"
