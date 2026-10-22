#!/usr/bin/env bash
# Builds the production package: dist/hessati-web-<date>.zip, ready to upload
# to the server and run with `node start.mjs` (see deploy/README.md).
set -euo pipefail
cd "$(dirname "$0")/.."

PLACEHOLDER="https://site-url.placeholder.invalid"
OUT=dist/hessati-web
STAMP=$(date +%Y%m%d-%H%M)

# A clean build: the build cache can keep an older site address.
rm -rf .next/cache .next/server .next/static .next/standalone "$OUT"
NEXT_PUBLIC_SITE_URL="$PLACEHOLDER" npm run build

# The standalone server, plus the files it serves but does not copy.
mkdir -p "$OUT"
cp -R .next/standalone/. "$OUT/"
cp -R public "$OUT/public"
mkdir -p "$OUT/.next"
cp -R .next/static "$OUT/.next/static"
cp deploy/start.mjs deploy/README.md "$OUT/"
# Env files the trace may have copied: the server gets its own .env below.
rm -f "$OUT"/.env "$OUT"/.env.*

# The server's settings. API_KEY comes from .env.local; SITE_URL is the
# site's domain, to fill in on the server.
API_KEY=$(grep -E '^API_KEY=' .env.local | head -1 | cut -d= -f2- || true)
cat > "$OUT/.env" <<EOF
# The site's public address (its own subdomain, not the API's).
SITE_URL=
# The backend and its key (server only, never sent to the browser).
API_BASE_URL=https://teacher.taseese.org/api
API_KEY=$API_KEY
# Where the site listens; the web server (Nginx/Apache) forwards to it.
PORT=3100
HOSTNAME=127.0.0.1
NODE_ENV=production
EOF

mkdir -p dist
(cd dist && rm -f "hessati-web-$STAMP.zip" && zip -qr "hessati-web-$STAMP.zip" hessati-web)
echo "Package: dist/hessati-web-$STAMP.zip ($(du -h "dist/hessati-web-$STAMP.zip" | cut -f1))"
