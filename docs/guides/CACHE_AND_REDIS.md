# Caches, Redis and "Clear all caches"

## Where cache lives

| Layer | What it holds | Cleared by |
|---|---|---|
| Visitor's browser | Service worker + cache storage (`public/service-worker.js`) | The site-wide cache version (below) |
| Cloudflare | JS/CSS and other static files (the HTML page is not cached) | Cloudflare purge |
| Render static-site CDN | The HTML, `s-maxage=300` | Refreshes on every deploy |
| Redis (server) | Read cache for property lists, details, search (`ggnhome:*` keys), rate-limit counters, voice queue | `ggnhome:*` keys are cleared by the button; the rest is never wiped |

## Redis setup (free tier)

Set **one** variable on the API service. Both modules accept either name:

```
REDIS_URL=rediss://default:<password>@<host>:<port>
```

- `config/cache.js` (read cache) uses `REDIS_URI` or `REDIS_URL`.
- `utils/redisCache.js` (rate limits, voice queue) uses `REDIS_URL` or `REDIS_URI`.
- Free plans are small. The read cache stores trimmed entries with short TTLs and falls back to MongoDB if Redis is down.
- Some free providers cap commands per day or month. The rate limiter issues a few commands per request and falls back to MongoDB if Redis errors, so a cap is not an outage, but watch usage.

## One click: clear everything

Admin → Home → **Clear all caches** (two-step confirm). It runs three independent steps:

1. **Browsers:** bumps the version at `GET /api/cache-version`. Each visitor's browser sees the new number, wipes its own caches and refreshes (instantly on a fresh load; via a "Refresh" banner while someone is using the site, so no form is lost). Logins are not touched.
2. **Redis:** deletes the `ggnhome:*` keys only.
3. **Cloudflare:** purge everything (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`).

Each step still runs if another is not connected, and the result says which parts were done.

### Without the admin page (Postman / scripts)

```
POST https://api.ggnhome.com/api/cron/purge-cache
x-cron-secret: <CRON_SECRET>
```

Optional body: `{ "files": ["https://www.ggnhome.com/doc"] }` limits the Cloudflare purge;
`{ "browsers": false }` or `{ "redis": false }` skips those steps.
