#!/usr/bin/env bash
# Deployment auf dem VPS: baut den angegebenen Git-Stand als versioniertes Image und startet ihn.
# Aufruf (im Repo-Verzeichnis auf dem VPS):  deploy/deploy.sh [git-ref]   (Default: origin/main)
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${1:-origin/main}"
STATE_DIR=".deploy"
mkdir -p "$STATE_DIR"

[ -f .env ] || { echo "FEHLER: .env fehlt (siehe .env.example)"; exit 1; }

git fetch --quiet origin
git checkout --quiet --detach "$REF"
VERSION="$(git rev-parse --short=12 HEAD)"
CURRENT="$(cat "$STATE_DIR/current" 2>/dev/null || true)"

echo "→ Build aboutexport-website:$VERSION"
APP_VERSION="$VERSION" docker compose build --pull web

echo "→ Start"
APP_VERSION="$VERSION" docker compose up -d --no-build web

echo "→ Warte auf Healthcheck"
for _ in $(seq 1 30); do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' aboutexport-web 2>/dev/null || echo starting)"
  [ "$STATUS" = healthy ] && break
  sleep 2
done
if [ "$STATUS" != healthy ]; then
  echo "FEHLER: Container nicht healthy ($STATUS)"
  if [ -n "$CURRENT" ]; then
    echo "→ Automatischer Rollback auf $CURRENT"
    APP_VERSION="$CURRENT" docker compose up -d --no-build web
  fi
  exit 1
fi

[ -n "$CURRENT" ] && [ "$CURRENT" != "$VERSION" ] && echo "$CURRENT" > "$STATE_DIR/previous"
echo "$VERSION" > "$STATE_DIR/current"
echo "✓ Deployed $VERSION (vorher: ${CURRENT:-keins})"
