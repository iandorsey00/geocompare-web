#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-146.190.43.199}"
REMOTE_USER="${REMOTE_USER:-ian}"
REMOTE_TMP_DIR="${REMOTE_TMP_DIR:-/tmp/geocompare-web-dist}"
REMOTE_TARGET_DIR="${REMOTE_TARGET_DIR:-/var/www/geocompare-web}"
SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"

npm install
npm run build
rsync -av --delete dist/ "${SSH_TARGET}:${REMOTE_TMP_DIR}/"
ssh -t "$SSH_TARGET" "sudo mkdir -p '${REMOTE_TARGET_DIR}' && sudo rsync -av --delete '${REMOTE_TMP_DIR}/' '${REMOTE_TARGET_DIR}/'"

echo "Deployed dist/ to ${SSH_TARGET}:${REMOTE_TARGET_DIR}"
