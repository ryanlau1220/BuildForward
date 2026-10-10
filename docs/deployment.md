# BuildForward — VPS deployment (Docker Compose + Nginx Proxy Manager)

Deploys the whole stack (PostgreSQL + FastAPI API + Next.js web) with Docker
Compose on a single VPS. TLS and reverse proxying are handled by your existing
Nginx Proxy Manager (NPM); this stack publishes the web and API ports to
`127.0.0.1` for NPM to proxy.

Domain used in these examples: `buildforward.duckdns.org` (already pointed at
the VPS public IP).

## Files

- `docker-compose.prod.yml` — production stack (db, api, web).
- `.env.production.example` — environment template (copy to `.env.production`).
- `services/api/Dockerfile`, `apps/web/Dockerfile` — production images.

## 1. Prerequisites on the VPS

- Docker Engine + Docker Compose v2.
- Nginx Proxy Manager running and reachable.
- DNS: `buildforward.duckdns.org` → VPS public IP (done).

## 2. Get the code and configure

```bash
git clone <your-repo-url> buildforward && cd buildforward
cp .env.production.example .env.production
```

Edit `.env.production`:

- `POSTGRES_PASSWORD` — set a strong value (`openssl rand -base64 24`).
- `NEXT_PUBLIC_API_URL` — the public origin, matching the scheme NPM serves.
  Use `https://buildforward.duckdns.org` once TLS is enabled in NPM.
- `CORS_ORIGINS` — the app origin, e.g. `https://buildforward.duckdns.org`.

> `NEXT_PUBLIC_API_URL` is compiled into the web bundle at **build time**.
> If you change it later you must rebuild the `web` image (step 4 with
> `--build`). Changing the scheme (http↔https) requires a rebuild too.

## 3. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Check health:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl -s http://127.0.0.1:8000/api/v1/health   # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/   # 200
```

The database is seeded automatically on first start. Its data persists in the
`postgres_data` volume across restarts and redeploys. **Do not** run
`down -v` on a database that holds imported/confirmed work — `-v` deletes the
volume.

## 4. Configure Nginx Proxy Manager

Recommended: single hostname, same-origin (no browser CORS).

1. Proxy Hosts → Add Proxy Host
   - Domain Names: `buildforward.duckdns.org`
   - Scheme: `http`
   - Forward Hostname/IP: the VPS host. If NPM runs as a container, use
     `host.docker.internal` (ensure it maps to the host gateway) or the VPS
     LAN/private IP; if NPM runs on the host directly, `127.0.0.1` works.
   - Forward Port: `3000`
   - Enable **Websockets Support** and **Block Common Exploits**.
2. Custom Locations (same proxy host) — route the API and docs to port 8000:
   - Location `/api` → Forward `http`, `<host>`, port `8000`
   - Location `/docs` → Forward `http`, `<host>`, port `8000`
   - Location `/openapi.json` → Forward `http`, `<host>`, port `8000`
3. SSL tab → request a Let's Encrypt certificate for the domain and enable
   **Force SSL** + HTTP/2. Then set `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS`
   to the `https://` origin and rebuild `web` (step 3 with `--build`).

Alternative: two hostnames.
- `buildforward.duckdns.org` → port `3000`
- `api.buildforward.duckdns.org` → port `8000`
- Set `NEXT_PUBLIC_API_URL=https://api.buildforward.duckdns.org` and keep
  `CORS_ORIGINS=https://buildforward.duckdns.org`, then rebuild `web`.

> Port binding: the compose file binds published ports to `127.0.0.1` by
> default (`WEB_BIND`/`API_BIND`). If NPM is a container and cannot reach the
> host loopback, either set those to `0.0.0.0` (and firewall ports 3000/8000
> from the public internet) or attach NPM to this stack's `internal` network
> and proxy to the service names `web:3000` / `api:8000`.

## 5. Update / redeploy

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Logs and lifecycle:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production restart api
docker compose -f docker-compose.prod.yml --env-file .env.production down   # stop (keeps data)
```

## Notes

- The API image runs as a non-root user and has a container `HEALTHCHECK` on
  `/api/v1/health`; `web` waits for the API to be healthy before starting.
- The build context excludes large coursework assets (`data/materials`,
  `data/submissions`) and the pitch deck via `.dockerignore`; the API only
  needs `data/sample_demo.json` and `data/imports/*.json` at runtime.
