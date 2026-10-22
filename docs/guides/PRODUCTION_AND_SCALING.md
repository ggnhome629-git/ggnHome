# Production and scaling (1.0.0)

How the API is set up for more than one database, more than one Cloudinary account and more than one server. Everything below is in the code; you only set environment variables (see `server/.env.example`).

## Start-up and shutdown

- Start command: `npm start` in `server/` (runs `node index.js`). Local development: `npm run dev` (nodemon). Do not run nodemon in production: it restarts on file changes and swallows the shutdown signal.
- On start the API checks its environment (`config/validateEnv.js`). In production it **stops with a list** if a required variable is missing (`MONGO_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, both `*_EXPIRE`). Optional ones print a warning and the feature that needs them stays off.
- On SIGTERM (every deploy) the API stops taking new requests, lets running ones finish (up to 25 s), then closes MongoDB and Redis. An uncaught exception also ends in this clean shutdown and a restart. An unhandled promise rejection is logged and the server keeps running.
- Timeouts: keep-alive 65 s, headers 66 s, request 120 s (longer than a load balancer's 60 s, so a reused connection is never already closed).

## Health checks

- `GET /health`: the process is up. Never touches the database. Use it for "is it alive".
- `GET /health/ready`: MongoDB answers, and the server is not shutting down. Returns 503 otherwise. It also lists Redis (`connected`, `down`, `off`), the number of Cloudinary accounts and which database (1, 2 ...) is in use. **Set this as the host's health check path.**

## More than one database (MongoDB)

- Set `MONGO_URI`, then `MONGO_URI_2`, `MONGO_URI_3` ... in order of preference.
- Start-up tries each in turn (4 rounds with a growing pause). While running, if the connection stays down for `MONGO_FAILOVER_AFTER_MS` (30 s) the API moves to the next URI.
- Every URI must serve **the same data**: a replica set, or standby clusters kept in sync by you (for example Atlas continuous backup restore, or a replica set that spans them). The API does not copy data between databases and does not split data across them.
- Pool: `MONGO_MAX_POOL_SIZE` (10) per server. Keep `servers x pool` below the connection limit of your plan (Atlas M0: 500).

## More than one Cloudinary account

- Add accounts as `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET`, then the same three with `_2`, `_3` ...
- Uploads rotate across the accounts. Each call carries its own credentials, so two uploads to two accounts at the same moment never mix keys.
- An account that reports a quota, rate-limit, credential or server problem rests for 10 minutes (`CLOUDINARY_COOLDOWN_MS`) and uploads go to a working account. A bad file is not retried on every account.
- Each property remembers the account it was uploaded to. Deleting a property deletes its photos from that account first, and from the other accounts for anything not found there, so storage is freed.
- Images are shrunk to about 1.5 MB (panoramas 5 MB) before upload; one file can never exceed 25 MB at the server.
- `GET /health/ready` shows how many accounts are configured. Admin → Usage & Limits shows each account's credits.

## More than one server

The API keeps no state on a server's disk or memory that other servers need:

- **Login** is token based (no server sessions).
- **Rate limits** are counted in Redis if `REDIS_URL` is set, otherwise in MongoDB, so a client cannot get a fresh allowance by hitting another server.
- **Scheduled jobs** (listing sync, ranking, push notifications) run once per slot across all servers: each server fires the schedule, the first to claim the lock in MongoDB (`JobLock`) runs it, the others skip. Lock times are about 20 h for the daily jobs; a server that dies mid-job frees the slot when that time ends.
- **Cache clear on deploy** is claimed per build the same way, so only one server does it.
- **Caches in a server's memory** (nearby places, the browser cache version) are small and expire in minutes or a day; use Redis for the shared read cache.
- External cron services (`/api/cron/*`) reach one server through the load balancer, which is what you want.

## Limits that are applied

| Where | Limit |
|---|---|
| JSON request body | 1 MB |
| Page size of any list (`limit`, `pageSize`, `perPage`) | 200 (`MAX_PAGE_SIZE`); property search 100 |
| `page` | 1 to 100000 |
| Photo upload at the server | 25 MB per file, 20 files; flatmate photos 5 MB; partner listings up to 18 photos |
| Photos stored | resized to about 1.5 MB |
| Requests per client | global limiter plus stricter ones for OTP, login, forms, search and AI (shared across servers) |
| SMS | daily and hourly limits and gaps, editable in the SMS Console, always capped by hard limits |
| MongoDB connections | `MONGO_MAX_POOL_SIZE` per server |
| Server request time | 120 s |

## Release checklist

1. Set the required variables (`server/.env.example`) and `PUBLIC_API_BASE_URL`, `ALLOWED_ORIGINS`, `CRON_SECRET`.
2. Set the health check path to `/health/ready`.
3. Add the Cloudinary accounts you need; add `REDIS_URL` if you run more than one server.
4. Add the Android signing secrets and the fingerprint (`ANDROID_APPS.md`).
5. Deploy. The API clears the browser, Redis and Cloudflare caches once for the new build.
6. Open `/health/ready`, `/apps` and `/doc` and check the four downloads.
