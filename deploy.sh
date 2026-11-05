#!/usr/bin/env bash
# One-command deploy: build locally, rsync to the server, fix permissions.
# Usage: ./deploy.sh [--skip-build]
# Overridable: HOST=aura-web REMOTE_DIR=/var/www/xtools BASE_URL=/ SITE_URL=https://xtools.codestudio.uk
set -euo pipefail

cd "$(dirname "$0")"

HOST="${HOST:-aura-web}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/xtools}"
OWNER="${OWNER:-www-data:www-data}"

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Building..."
  pnpm build
  echo "==> Pre-rendering pages and generating sitemap..."
  SITE_URL="${SITE_URL:-https://xtools.codestudio.uk}" node scripts/seo-postbuild.mjs
fi

[[ -f dist/index.html ]] || { echo "dist/index.html not found, build first" >&2; exit 1; }

echo "==> Uploading to ${HOST}:${REMOTE_DIR}"
rsync -rlptvz --delete --rsync-path="sudo rsync" --chown="${OWNER}" \
  dist/ "${HOST}:${REMOTE_DIR}/"

echo "==> Fixing permissions"
ssh "${HOST}" "sudo find '${REMOTE_DIR}' -type d -exec chmod 755 {} + && sudo find '${REMOTE_DIR}' -type f -exec chmod 644 {} +"

echo "==> Done"
