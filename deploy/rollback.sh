#!/usr/bin/env bash
# Rollback auf das vorherige (oder angegebene) Image-Tag – ohne neuen Build.
# Aufruf:  deploy/rollback.sh [image-tag]
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-$(cat .deploy/previous 2>/dev/null || true)}"
[ -n "$TARGET" ] || { echo "FEHLER: kein vorheriges Tag bekannt. Verfügbare Images:"; docker images aboutexport-website; exit 1; }
docker image inspect "aboutexport-website:$TARGET" >/dev/null || { echo "FEHLER: Image aboutexport-website:$TARGET fehlt"; exit 1; }

APP_VERSION="$TARGET" docker compose up -d --no-build web
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' aboutexport-web)" = healthy ] && break
  sleep 2
done
docker inspect -f '{{.State.Health.Status}}' aboutexport-web
CURRENT="$(cat .deploy/current 2>/dev/null || true)"
echo "$TARGET" > .deploy/current
[ -n "$CURRENT" ] && echo "$CURRENT" > .deploy/previous
echo "✓ Rollback auf $TARGET"
