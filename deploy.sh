#!/usr/bin/env bash
set -euo pipefail

# Run from your local terminal after pushing the release to origin/main.
# The SSH alias "oracle" uses your existing SSH configuration.
ssh oracle 'bash -se' <<'REMOTE'
set -euo pipefail

cd /home/ubuntu/BuildForward

if [[ ! -f .env.production ]]; then
  echo 'Missing /home/ubuntu/BuildForward/.env.production' >&2
  exit 1
fi

if [[ $(git branch --show-current) != main ]]; then
  echo 'The VPS checkout must be on main.' >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo 'The VPS checkout has uncommitted changes. Resolve them before deploying.' >&2
  exit 1
fi

echo 'Updating production checkout...'
git pull --ff-only origin main

echo 'Validating and starting production services...'
docker compose -f docker-compose.prod.yml --env-file .env.production config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --wait --wait-timeout 180

echo 'Checking production endpoints...'
for url in \
  http://127.0.0.1:3000/ \
  http://127.0.0.1:8000/api/v1/health \
  https://buildforward.duckdns.org/ \
  https://buildforward.duckdns.org/api/v1/health \
  https://buildforward.duckdns.org/docs \
  https://buildforward.duckdns.org/openapi.json; do
  curl --fail --silent --show-error --output /dev/null \
    --retry 5 --retry-all-errors --retry-delay 2 --connect-timeout 5 --max-time 15 \
    "$url"
  echo "OK $url"
done

echo "Deployed $(git rev-parse --short HEAD)"
docker compose -f docker-compose.prod.yml --env-file .env.production ps
REMOTE
