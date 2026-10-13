#!/usr/bin/env bash
# Smoke-Test gegen eine laufende Instanz (lokal oder öffentlich). Sendet KEINE Formulare.
# Aufruf:  deploy/smoke-test.sh [base-url]   (Default: http://127.0.0.1:4321)
set -uo pipefail
BASE="${1:-http://127.0.0.1:4321}"
FAIL=0
check() { # url expected-status [expected-location-suffix]
  local res code loc
  res="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$1")"
  code="${res%% *}"; loc="${res#* }"
  if [ "$code" != "$2" ] || { [ -n "${3:-}" ] && [[ "$loc" != *"$3" ]]; }; then
    echo "✗ $1 → $res (erwartet $2 ${3:-})"; FAIL=1
  else
    echo "✓ $1 → $code ${3:-}"
  fi
}
check /healthz 200
check / 200
check /blog/ 200
check /aboutexport-waitlist-early-access/ 200
check /bafa-exportkontrolle-april-2026/ 200
check /vision-export-compliance-monitoring/ 200
check /category/news/ 200
check /category/regulierung/ 200
check /impressum/ 200
check /datenschutz/ 200
check /feed/ 200
check /sitemap.xml 200
check /robots.txt 200
check /blog 301 /blog/
check /category/export-compliance/ 301 /blog/
check /author/aboutadmin/ 301 /blog/
check /Datenschutz 301 /datenschutz/
check /cookie-richtlinie/ 301 /datenschutz/
check /comments/feed/ 301 /feed/
check /sitemap_index.xml 301 /sitemap.xml
check /gibt-es-nicht/ 404
ENC="$(curl -s -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$BASE/" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')"
[ -n "$ENC" ] && echo "✓ Kompression: $ENC" || { echo "✗ keine Kompression auf /"; FAIL=1; }
HSTS="$(curl -sI "$BASE/" | grep -ci '^strict-transport-security')"
[ "$HSTS" -ge 1 ] && echo "✓ Security-Header" || { echo "✗ Security-Header fehlen"; FAIL=1; }
[ "$FAIL" = 0 ] && echo "SMOKE TEST OK" || { echo "SMOKE TEST FEHLGESCHLAGEN"; exit 1; }
