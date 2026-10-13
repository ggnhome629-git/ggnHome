# GgnHome Free-Tier Services & Scale Readiness Audit

**Audit date:** 2026-10-13  
**Repository:** `ggnhome629-git/ggnHome`  
**Branch snapshot:** `main` at `2e0afa90ea1a67c5d29c14a7b2f2835f3a05477f`  
**Scope:** Repository-wide tracked-file inventory (684 files), service/config/dependency/workflow keyword sweep, and focused review of service integration modules. This is a code/configuration audit, not a live account-quota inspection or a claim that all end-to-end paths were executed.

## Executive summary

The application has useful protections already (bounded image uploads, short cache TTLs, an optional Redis cache fallback, a rule-based AI path, Groq text-request timeouts and local estimates, a Redis-backed voice admission queue, SMS-device rate caps, and push-job caps). However, **the repository does not consistently enforce every provider's free-tier limits**. Several limits are only documented or left to provider-side throttling.

### Highest-priority findings

1. **Redis free-tier command budget can be exceeded by voice queue polling alone.** The browser polls queue status every 8 seconds. One continuously waiting browser makes about 10,800 status requests/day or 324,000 per 30-day month. Two continuously waiting browsers make about 648,000/month before active-session heartbeats, cache, rate limiting, and other Redis traffic. Upstash's published free plan is 500,000 commands/month, 256 MB, and 10 GB bandwidth. With up to 50 waiting users, the theoretical status-poll volume is about 16.2 million polls/month. The current queue size limit is a capacity bound, **not** a Redis-quota guard.
2. **Render free-instance hours are shared at workspace level.** The documented allowance is 750 free instance hours per workspace per calendar month. A continuously awake web service uses about 720 hours in a 30-day month / 744 hours in a 31-day month. Keep-alive pings can prevent idle spin-down; multiple always-on free web services can exhaust the workspace allowance. Free services also sleep after 15 minutes without inbound traffic, have ephemeral filesystems, and cannot scale horizontally.
3. **Groq text quota tracking is process-local.** The code uses conservative local limits and respects provider response headers / 429 cooldowns, but its counters are in memory. Multiple API instances each get their own ledger, so their combined usage can exceed one Groq organization's shared quota. Multiple API keys do not multiply the organization's quota.
4. **Groq speech usage has no equivalent shared daily budget in the LiveKit agent.** The real-time voice queue limits simultaneous sessions, but it does not enforce STT/TTS request/day quotas. If Groq is the selected speech provider, the TTS model may be the bottleneck long before the queue reaches its active-session cap.
5. **Cloudinary has upload-size controls but no app-level monthly credit stop.** Free-plan usage is shared across transformations, storage and bandwidth. The code supports round-robin across multiple Cloudinary accounts; do not assume that creating/rotating multiple free accounts is an approved way to multiply quotas.
6. **Brevo transactional email calls are not guarded by an application-wide daily quota counter.** Provider-side limits/retry behaviour are relied upon; email sends can fail or queue once the free daily quota is exhausted.
7. **OpenStreetMap public tiles are not an unlimited free production CDN.** The app uses the community tile endpoint directly. Attribution, cache behaviour, referrer and usage policy must be respected; access can be blocked without notice.
8. **Scraper sources (NoBroker / 99acres) do not expose a guaranteed free API quota in this repository.** The code has delays/retries/page limits in the standalone scraper, but these do not guarantee permission or protect against upstream anti-bot blocks. There are separate server-side and standalone scraper/scheduler paths, so avoid enabling both for the same workload without coordination.

## Service inventory and compliance assessment

Status meanings:
- **PARTIAL** — some relevant controls exist, but no complete provider-quota enforcement.
- **RISK** — a likely free-tier or policy failure mode is visible in code.
- **VERIFY ACCOUNT** — the service's exact plan/quota depends on the account or deployment; not visible from source.
- **CONDITIONAL** — only used when the relevant key/configuration is set.
- **NO FIXED FREE QUOTA** — self-hosted or third-party terms mean no stable free usage allowance can be assumed.

| Service / dependency | Evidence and purpose | Published free-tier / policy boundary (checked 2026-10-13) | Current code controls | Assessment |
|---|---|---|---|---|
| **Render Web Services** | API and other app services are deployed on Render; `/api/keep-alive` exists in `server/index.js`. | 750 free instance hours per workspace/month; free web services spin down after 15 min idle, restart can occur, filesystem is ephemeral, no horizontal scaling/persistent disk. | Keep-alive endpoint exists; cron/external pings are described in code/docs. No repository-level workspace-hours budget or cross-service usage guard. | **RISK — high.** Count all free web services in the workspace. Do not ping every free service continuously without checking aggregate hours. Keep uploads and durable data off the ephemeral filesystem. |
| **MongoDB Atlas** | Mongoose in `server/config/db.js`, models throughout `server/models`; standalone scraper also uses Mongoose. | Atlas Free cluster currently has 512 MB data + index storage, shared resources, no backups, limited features; free cluster capacity and connection limits are tier-specific. | Indexes and some query/pool helpers exist. `configureMongoose()` defines pool settings in `server/config/dbOptimization.js`, but the main connection path in `server/config/db.js` calls `mongoose.connect(process.env.MONGO_URI, {})`; do not assume helper settings are applied unless wired into that call. | **PARTIAL / VERIFY ACCOUNT.** Monitor data+index growth, slow queries and connection use; establish tested backups/exports before real production data grows. |
| **Upstash Redis (or compatible Redis)** | `server/utils/redisCache.js` is used by rate limiting and voice queue; `server/services/voiceQueue.service.js` stores opaque tickets in sorted sets. | Upstash Redis Free: 500,000 commands/month, 256 MB data, 10 GB monthly bandwidth (verify the current account/pricing page before relying on this). | Voice queue caps active sessions and waiting tickets, expires leases, and stores no transcript/PII. Redis client has connection/retry handling. Queue status is polled every 8 sec; active reservations heartbeat every 25 sec. | **RISK — critical.** Queue caps do not cap command volume. Two continuously waiting clients can generate ~648k status polls per 30 days before other Redis traffic. Implement a shared budget/telemetry and reduce polling (exponential backoff or push updates), or budget for a larger tier before opening the queue to traffic. |
| **Legacy Redis cache config** | `server/config/cache.js` uses `REDIS_URI`; current queue/rate-limit Redis wrapper uses `REDIS_URL`. Search did not find an active import of `server/config/cache.js`. | Same provider quota applies if both variables point to the same database/account. Each independent client may also add connections. | Legacy cache has short TTLs and degrades to MongoDB on failure, but its env name differs. | **VERIFY / cleanup candidate.** Confirm this module is unused or consolidate Redis configuration to one client/variable. Do not configure two Redis endpoints accidentally. |
| **Groq text LLM** | `server/services/aiConsultant/groqClient.js`; used only as optional fallback for unparsed consultant messages. Default model is `openai/gpt-oss-120b`. | Free limits vary by model and organization. The code documents base free limits for this model as 30 RPM, 1,000 RPD, 8,000 TPM and 200,000 TPD; account limits/provider headers are authoritative. | Defaults are more conservative (25 RPM, 900 RPD, 7,000 TPM, 180,000 TPD), estimates tokens, times out, retries at most once, uses response headers and cooldowns. Up to five keys are supported but the code notes quota is organization-wide. | **PARTIAL.** Good single-process guard; counters are in-memory and therefore not shared between multiple server instances/restarts. Use a shared Redis/database quota ledger or keep one API instance until that is implemented. Validate the exact model's current account limits. |
| **Groq speech-to-text / text-to-speech** | `services/livekit-agent/agent.py` and `.env.example`; defaults select Groq STT and Groq TTS unless other provider keys change selection. | Free limits are model-specific and can be much tighter than text completion. Groq docs list free-plan examples for `whisper-large-v3-turbo` (20 RPM / 2,000 RPD, audio-second quotas) and `canopylabs/orpheus-v1-english` (10 RPM / 100 RPD / 1.2K TPM / 3.6K TPD); check current account limits. | The voice queue caps concurrent sessions at 3 by default and agent has idle-session handling. No cross-instance STT/TTS daily budget or provider-usage ledger was found in the agent. | **RISK — high.** Three concurrent sessions do not guarantee speech quota compliance. Add provider-specific counters/circuit breakers and usage monitoring; gracefully switch to text/browser voice when provider quota is low or returns 429. |
| **LiveKit** | Self-hosted LiveKit server in `infra/livekit/docker-compose.yml`; API issues short-lived room tokens in `server/controllers/livekitVoice.controller.js`. | This repository configures **self-hosted LiveKit**, not LiveKit Cloud's free Build plan. There is no LiveKit Cloud allowance to count here; capacity/cost depends on the VM, bandwidth, CPU, TURN/network configuration and the speech providers. | Room-scoped short-lived tokens, Redis admission queue, active-session cap, idle cleanup and health endpoint exist. | **PARTIAL / VERIFY HOST.** Confirm the VM provider and its free eligibility, egress, memory/CPU and uptime. Load-test concurrency and monitor voice provider usage; self-hosted does not mean infrastructure is cost-free. |
| **Deepgram / Cartesia / Sarvam (optional speech providers)** | Provider selection and env variables are documented in `services/livekit-agent/agent.py` and `.env.example`. | Free credits, trials and quotas depend on each account/plan; a trial balance is not a permanent free tier. | Provider can be selected by environment configuration; no unified usage ledger across providers was found. | **CONDITIONAL / VERIFY ACCOUNT.** Keep disabled unless a valid account and acceptable free quota are confirmed. Never describe these as permanently free without checking the account. |
| **Cloudinary image/video storage and CDN** | `server/config/FileHandling.js`, `FileHandling2.js`, `client/src/utils/cloudinaryImage.js`; admin usage endpoint in `server/controllers/admin.Accountsusage.js`. | Free plan: 25 credits per rolling 30-day window for transformations, storage and bandwidth together. One credit is 1,000 transformations OR 1 GB managed storage OR 1 GB image bandwidth; actual usage consumes these resources together. | Upload compression targets (roughly 1.5 MB normal / 5 MB panorama, 1 MB agent) and a 10 MB hard ceiling exist. Usage endpoint caches results for 60 sec. | **PARTIAL / RISK.** File size control helps but does not enforce monthly credits. The multi-account round-robin uploader should not be treated as a way to multiply free quotas unless provider terms explicitly allow the setup. Alert before exhaustion; resize/format-convert and reuse transformed assets. |
| **Brevo transactional email** | `server/utils/sendEmail.js`; usage helper in `server/controllers/admin.Accountsusage.js`. | Free plan: 300 email sends/day; up to 100,000 contacts. After the daily cap, transactional email may be held in a retry queue (up to 1,000) and excess mail is not delivered. | SDK call errors are thrown; usage helper exists, but no shared daily send counter / reservation / back-pressure was found in `sendEmail.js`. | **PARTIAL / RISK.** OTP, lead, reminder and notification bursts can hit the daily cap. Add a shared counter, prioritise security/transactional mail, queue noncritical messages and alert on quota/429/failure. |
| **Firebase Cloud Messaging (FCM)** | `server/services/push.js`, smart/popular push jobs, Android Firebase config/build files. | FCM is listed as a no-cost Firebase product; project/service quotas and abuse protections still apply. It is not the same as Firebase Phone Auth (which is billed per SMS). | Push code no-ops when credentials are absent; jobs have caps such as `max=300` and dedupe/logging windows. | **PARTIAL.** Better bounded than unbounded broadcasts, but check project quotas and failure counts. Keep push separate from OTP SMS; do not confuse FCM free status with SMS/phone-auth being free. |
| **LocationIQ** | Mentioned in docs/config names; legacy `server/controllers/mapintegration.js` endpoint now returns HTTP 410 instead of exposing a key. No active LocationIQ API URL was found in the current code search. | Free plan: 5,000 requests/day, 2 requests/second and 60 requests/minute; limited commercial use requires a prominent LocationIQ attribution link. | Legacy key-exposure endpoint is retired; current map UI uses OSM tiles. Active geocoding integration was not confirmed by this scan. | **CONDITIONAL / VERIFY.** Do not count this as an active service until a real call site is identified. If re-enabled, use a server-side proxy, throttle/caching and required attribution. |
| **OpenStreetMap standard raster tiles** | Leaflet map integrations use `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` in user and agent property views. | No guaranteed free production quota/SLA. Policy requires visible attribution, normal browser Referer, cache compliance (at least 7 days if HTTP caching cannot be honored), no bulk downloads/offline prefetch, and allows blocking abusive use. | Uses public tile endpoint directly; no app-controlled tile-provider switch or explicit server-side usage monitor was identified. Normal browser caching may help but must be verified. | **RISK as traffic grows.** Keep use interactive only, preserve attribution/cache/referrer, never prefetch tiles, and plan a commercial tile provider or own tiles before high traffic. |
| **NoBroker / 99acres** | Root `scraper/` and server-side scraper/sync services; `.env.example` uses 2-second delay, 30-second timeout, 3 retries and 5 pages/source. | No verified free API quota or permission is supplied by this repository. Public site access, anti-bot controls, robots/terms and affiliate rules can change; HTML scraping is not a stable API contract. | Standalone scraper has delay, timeout, retry and page-count settings; server sync has a separate daily cron/admin toggle and job logging. | **RISK / policy review required.** Prefer authorised feeds/affiliate APIs. Coordinate standalone and server schedulers so they do not scrape the same source simultaneously. Treat 429/403/CAPTCHA as a stop signal, not a cue to increase retries. |
| **SMS: own Android SIM gateway** | `server/utils/sendSms.js`, `server/controllers/smsGateway.controller.js`, `sms-gateway-app/`. | No provider-wide free tier: carrier/SIM plan, operator fair-use and country/route rules apply. SMS sent through a SIM still consumes the mobile plan and can be blocked. | Per-device auto defaults: 30/hour, 90/day (overridable daily env), 8–14 sec gaps; hard caps 60/hour and 200/day; max 3 attempts; old OTPs expire. | **PARTIAL.** App caps are useful safety ceilings, not a carrier guarantee. Verify every device's actual plan, delivery reports, failure/retry behaviour and per-recipient OTP throttles. |
| **SMS-Gate third-party gateway (optional)** | `server/utils/sendSms.js` selects it when `SMS_GATEWAY_USER` and `SMS_GATEWAY_PASSWORD` are present. | No free-tier limit is documented in the repository; plan/credit/rate limit must be checked in that account. | HTTP timeout is 10 seconds; no application-level daily message quota or queue reservation was identified for this branch. | **CONDITIONAL / VERIFY ACCOUNT.** Do not enable under a “free-only” assumption until its current account pricing and limits are confirmed. Add a send budget and provider-error handling. |
| **GitHub Actions** | `.github/workflows/*.yml`: client build, partner portal build, Android APK/release builds, notification checks. | GitHub Free hosted-runner allowance is typically 2,000 minutes/month and 500 MB artifact storage for Free plans; exact allowance depends on repository visibility/account plan and can change. Public repositories may have different included-minute rules. | Workflows are event-triggered and build APKs/releases; each extra run consumes minutes/artifact storage. | **VERIFY ACCOUNT.** Check Actions billing/usage and artifact retention. Avoid redundant Android builds on every documentation-only change; retain only release artifacts for the period needed. |
| **Cloudflare / external cron service** | Cloudflare is mentioned in rate-limit comments; cron-job.org is referenced as an external trigger example in comments/docs. No billing credentials/config proving the active plan is included here. | Free quotas, rate limits and account features depend on the actual plan and whether those integrations are enabled. | API cron endpoints require `CRON_SECRET`; server has a keep-alive route. | **VERIFY DEPLOYMENT.** Confirm which services are actually enabled in the account. Keep secrets out of URLs/logs and rate-limit public trigger routes. |
| **npm packages / Leaflet / React / Node / Python** | Dependency manifests in root, `client/`, `server/`, `scraper/`, `mobile/`, `partner-portal/`, and `services/livekit-agent/`. | These are software dependencies, not managed API free tiers. Some packages call external providers; package licence and runtime resource use still matter. | Lockfiles and package manifests exist for main client/server/scraper. | **NOT A SERVICE QUOTA.** Keep dependencies patched and review licenses/security separately. |

## Detailed findings and recommended actions

### P0 — Redis voice queue usage

The queue status route runs a Redis Lua `EVAL` on each browser poll. At an 8-second polling interval:

- 1 continuously waiting browser: 10,800 polls/day; 324,000 polls/30 days.
- 2 continuously waiting browsers: 648,000 polls/30 days.
- 50 continuously waiting browsers: 16,200,000 polls/30 days.

These are HTTP poll counts and a lower-bound proxy for Redis command consumption; additional Redis operations and cache/rate-limit traffic increase the total. The 50-waiter cap therefore does **not** make the queue safe for a 500k-command free plan.

Recommended:
1. Add queue polling backoff (for example 8s → 15s → 30s → 60s while far from the front), and reset to a faster cadence only near a slot.
2. Better: use server-sent events/WebSocket push for position updates, while keeping lease/heartbeat operations bounded.
3. Add a shared Redis command-budget/usage alert and a kill switch for voice queue. Disable queued voice gracefully before quota exhaustion; preserve text/basic consultant fallback.
4. Keep cache/rate limiting/voice queue usage visible separately where possible. Confirm whether all use the same Redis database and credentials.

### P0 — Render free-hour accounting

A single always-awake service consumes approximately the full 750-hour workspace allowance in a 31-day month. A keep-alive job that hits the API every few minutes may prevent idle sleep; that is not free capacity. Static sites do not use web-service instance hours in the same way, but each free web service shares the workspace allowance.

Recommended:
1. List every Render service and its instance type/plan in the dashboard.
2. Disable keep-alive for services that can tolerate cold starts; keep only the service that truly needs continuous availability.
3. Do not put important uploads or local databases on a free service filesystem.
4. If the API, partner backend, scraper daemon, or voice worker needs reliable always-on service, budget for a paid instance or move the worker to a host with an explicit suitable free allowance.

### P1 — AI quota accounting

**Text Groq:** the existing guard is a good single-process safety net, but it is not a distributed quota ledger. The five-key support is for key resiliency, not multiplying free quota. On multi-instance deployments, all instances need one shared usage counter and lock/atomic reservation, or each instance must be assigned a safe fraction of the organization quota.

**Speech Groq:** the voice queue is not a provider quota guard. Keep speech provider choice explicit, record request counts/audio seconds/tokens and 429s, and stop/reduce new voice admissions before daily quota exhaustion. Verify actual free-plan model IDs and current limits from the Groq console; do not rely solely on generic docs.

### P1 — Cloudinary credits and account rotation

Upload compression helps bandwidth and source-file size, but Cloudinary's monthly credits combine storage, bandwidth and transformations. Admin usage reporting is helpful but does not automatically prevent an upload burst from crossing the free allocation.

Recommended:
1. Alert at 70%, 85% and 95% of the actual account credit limit.
2. Add a shared reservation/soft-block policy for nonessential uploads when credits are low.
3. Generate responsive derivatives once and reuse them; avoid unique transformations on every render.
4. Use one legitimate account or an explicitly approved multi-product/account arrangement. Do not rely on multiple free accounts as quota multiplication.

### P1 — Email and SMS

Brevo's daily email limit and the SIM carrier's SMS limits are independent. A successful API call is not proof that an email/SMS was delivered. Security OTP traffic should have priority over reminders, marketing and bulk notifications.

Recommended:
- Track per-day provider accepted sends, failed sends, 429s and queued/rejected counts.
- Add bounded queues, per-phone/per-IP/per-recipient throttles, OTP resend cooldowns and deduplication.
- Never retry OTP sends indefinitely. Expire queued OTP messages before delivery if their validity window has passed.
- Confirm carrier/device rules for the Android SIM gateway and the actual SMS-Gate account plan before turning it on.

### P1 — Maps and geocoding

Leaflet is a library; the raster tiles are served by the OpenStreetMap Foundation. Its data is open, but its community-funded tile server is not a guaranteed free CDN. The map must keep visible attribution and browser caching/referrer behaviour. Avoid bulk tile loads, map prefetch and offline download.

LocationIQ appears in legacy documentation/environment names, but its old key endpoint has been retired and an active provider API call was not confirmed in this scan. If it is reintroduced, the current free allowance is 5,000 requests/day and 2 requests/sec (also 60/minute), with limited commercial use requiring attribution.

### P1 — Scraper scheduling and upstream terms

The standalone `scraper/scheduler.js` defaults to Friday 09:00 and the server has a separate daily NoBroker sync cron gated by admin settings. These are distinct mechanisms; running both can duplicate load. The sample `.env.example` has `ENABLE_SCHEDULE=false`, but actual production environment and deployed processes are unknown.

Recommended:
- Make one scheduler the owner for each source and use a distributed job lock if multiple instances can run.
- Set global per-domain concurrency, request budgets and a circuit breaker for 403/429/CAPTCHA.
- Review each source's terms/robots and affiliate permissions. Prefer an authorized feed/API; do not evade access controls.
- Keep page count, delay and retry attempts configurable, but ensure retries have exponential backoff and a hard run budget.

### P2 — MongoDB and backups

Free Atlas is suitable for prototypes and low-throughput applications, but 512 MB includes data and indexes, and free clusters do not provide managed backups. Scraper inventory, audit logs, OTP/SMS logs, tracking and analytics may grow independently of the property collection.

Recommended:
- Measure data + index size and top collections weekly.
- Add retention/TTL policies for ephemeral logs where legally appropriate; keep business/lead data according to retention requirements.
- Verify actual connection-pool settings and do not open a new connection per request/job.
- Test an export/restore workflow. Do not assume a free-cluster snapshot exists.

## Environment/configuration inventory checklist

These variables/services were identified in source, docs or examples. A variable appearing in code does not prove it is set in production.

- **MongoDB:** `MONGO_URI` (main server), `MONGODB_URI` (standalone scraper)
- **Redis:** `REDIS_URL` (queue/shared cache/rate limiter wrapper), legacy `REDIS_URI` in `server/config/cache.js`
- **Groq text:** `GROQ_API_KEY_1..5`, `GROQ_API_KEYS`, `GROQ_API_KEY`, `AI_CONSULTANT_LLM`, `GROQ_MODEL`, `GROQ_RPM_LIMIT`, `GROQ_RPD_LIMIT`, `GROQ_TPM_LIMIT`, `GROQ_TPD_LIMIT`, `GROQ_TIMEOUT_MS`
- **Voice queue:** `VOICE_QUEUE_ENABLED`, `VOICE_QUEUE_MAX_ACTIVE`, `VOICE_QUEUE_MAX_WAITING`, `VOICE_QUEUE_LEASE_SECONDS`, `VOICE_QUEUE_WAIT_TTL_SECONDS`, `VOICE_QUEUE_KEY_PREFIX`
- **LiveKit:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`
- **Voice providers:** `GROQ_SPEECH_API_KEY`, `GROQ_STT_MODEL`, `GROQ_TTS_MODEL`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `SARVAM_API_KEY`, local STT/TTS URLs and models
- **Cloudinary:** `CLOUDINARY_CLOUD_NAME[_N]`, `CLOUDINARY_API_KEY[_N]`, `CLOUDINARY_API_SECRET[_N]`, plus `AGENT_CLOUDINARY_*`
- **Email:** `BREVO_API_KEY`, `SENDER_EMAIL`, `SENDER_NAME`
- **Maps:** `LOCATIONIQ_API_KEY` / legacy `LOCATION_IQ_KEY` documentation
- **Push:** `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_APPLICATION_CREDENTIALS`
- **SMS:** `SMS_KEY`, `SMS_DEVICE_KEY`, `SMS_DEVICE_DAILY_LIMIT`, `SMS_GATEWAY_USER`, `SMS_GATEWAY_PASSWORD`, `SMS_GATEWAY_URL`
- **Scraping:** `NOBROKER_PAGES_TO_SCRAPE`, `NINETY_NINE_ACRES_PAGES_TO_SCRAPE`, `SCRAPER_DELAY_MS`, `SCRAPER_TIMEOUT`, `SCRAPER_RETRY_ATTEMPTS`, `ENABLE_SCHEDULE`, `SCHEDULE_TIME`, `ENABLE_NOBROKER_CRON`
- **External job triggers:** `CRON_SECRET`
- **Builds:** GitHub Actions workflows for client, partner portal, APKs and releases

## What this audit cannot verify from the repository

The following require dashboard access or production telemetry:
- Which Render services are actually on Free vs paid plans and current workspace-hour/bandwidth use.
- Whether Redis is Upstash, its actual tier, commands/month, memory and bandwidth.
- Current Groq organization/model quotas and recent consumption.
- Cloudinary actual credits across configured accounts.
- Brevo current plan, accepted/delivered emails and daily sends.
- Actual SMS carrier/SIM limits and SMS-Gate account plan.
- Firebase project quotas, enabled APIs and delivery failures.
- Actual LocationIQ usage/account tier and whether any legacy code path is still deployed.
- MongoDB Atlas cluster tier, remaining storage, connection count and backup/export status.
- LiveKit VM capacity, outbound bandwidth and current concurrent sessions.
- GitHub Actions billing/usage for the repository's visibility and account plan.

## Official references

Provider terms and free-tier allowances can change. Recheck these before setting production thresholds.

- Render free services: https://render.com/docs/free
- MongoDB Atlas cluster tiers: https://www.mongodb.com/docs/atlas/manage-clusters/
- MongoDB Atlas limits: https://www.mongodb.com/docs/atlas/reference/limitations/
- Upstash Redis pricing: https://upstash.com/pricing/redis
- Groq rate limits: https://console.groq.com/docs/rate-limits
- Groq speech-to-text model: https://console.groq.com/docs/model/whisper-large-v3-turbo
- LiveKit deployment quotas: https://docs.livekit.io/deploy/admin/quotas-and-limits/
- Cloudinary credits/billing: https://cloudinary.com/documentation/billing_and_plans
- Brevo Free plan limits: https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan
- Firebase pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- LocationIQ pricing: https://locationiq.com/pricing
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- GitHub Actions included usage: https://docs.github.com/en/enterprise-cloud%40latest/actions/reference/limits

## Recommended implementation order

1. **Immediately:** lower voice queue poll rate / add backoff and a quota-aware queue kill switch for Redis.
2. **Immediately:** inspect Render service count and workspace usage; remove unnecessary keep-alive pings.
3. **Next:** shared Groq text quota ledger and separate STT/TTS usage/circuit-breaker logic.
4. **Next:** Brevo daily quota guard; Cloudinary threshold alerts and upload soft-block.
5. **Next:** coordinate scraper schedules, hard per-domain run budgets, and document source permissions.
6. **Next:** verify MongoDB backup/export and connection-pool configuration.
7. **Before meaningful growth:** choose a production map tile provider, define per-service alerts, and record actual account plan/limits in a deployment inventory.

**Bottom line:** the app has some good local limits, but it is not yet safe to assume that all integrated services stay inside their free-tier quotas during growth. Redis voice polling, Render always-on hours, Groq multi-instance quota accounting, speech-provider daily limits, and Cloudinary/Brevo usage are the most important gaps to address first.
