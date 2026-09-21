/**************************************************************
 * cache.js
 *
 * Thin Redis cache in front of the read-heavy property endpoints.
 *
 * Two rules shape everything here:
 *
 *  1. The cache is optional. If REDIS_URI is not set — or Redis is down,
 *     unreachable or out of memory — every helper degrades to a miss and the
 *     caller falls through to MongoDB. A cache problem must never turn into
 *     a failed request.
 *
 *  2. The cache is small. A 30 MB plan holds roughly 45k card-sized entries,
 *     so list endpoints store trimmed card projections (~0.5 KB each) rather
 *     than full documents (~5 KB each), and everything carries a short TTL.
 **************************************************************/

const KEY_PREFIX = "ggnhome";

// Seconds. Deliberately short — these back a listings feed where a couple of
// minutes of staleness is invisible, and writes invalidate explicitly anyway.
const ttl = {
  propertyList: 120,
  propertyDetail: 300,
  search: 300,
  sectors: 3600,
};

let client = null;
let redisEnabled = false;
// Set once Redis has failed in a way that is not worth logging on repeat, so
// a dead cache doesn't flood the logs with one line per request.
let warnedUnavailable = false;

const warnOnce = (message, error) => {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.warn(`[cache] ${message}${error ? `: ${error.message}` : ""}`);
  console.warn("[cache] Falling back to MongoDB for all reads until Redis recovers.");
};

if (process.env.REDIS_URI) {
  try {
    // Required lazily so a project without the dependency installed still
    // boots — the cache simply stays off.
    const Redis = require("ioredis");

    client = new Redis(process.env.REDIS_URI, {
      // Fail a command fast instead of hanging a request behind a dead socket.
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      // Without this, commands issued while disconnected queue up and resolve
      // late — we want an immediate error so the caller reads from Mongo.
      enableOfflineQueue: false,
      // Back off rather than hammering a down instance; null stops retrying.
      retryStrategy: (attempt) => (attempt > 10 ? null : Math.min(attempt * 500, 5000)),
    });

    client.on("ready", () => {
      warnedUnavailable = false;
      console.log("[cache] Redis connected");
    });
    // ioredis emits 'error' on every reconnect attempt; without a listener
    // Node treats it as an unhandled error event and kills the process.
    client.on("error", (err) => warnOnce("Redis unavailable", err));

    redisEnabled = true;
  } catch (err) {
    console.warn(`[cache] Could not initialise Redis: ${err.message}`);
    console.warn("[cache] Run `npm install ioredis` in /server to enable caching.");
    client = null;
    redisEnabled = false;
  }
} else {
  console.log("[cache] REDIS_URI not set — caching disabled, reads go straight to MongoDB.");
}

const isReady = () => redisEnabled && client && client.status === "ready";

/**
 * Builds a stable, namespaced key. Params are sorted so that logically
 * identical queries with differently-ordered params share one entry instead
 * of each burning its own slice of a small cache.
 *
 *   cache.key("properties:active", { limit: 12, page: 1 })
 *     -> "ggnhome:properties:active:limit=12&page=1"
 */
const key = (namespace, params) => {
  const base = `${KEY_PREFIX}:${namespace}`;
  if (!params) return base;

  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => [name, Array.isArray(value) ? [...value].sort().join(",") : String(value)])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");

  return serialized ? `${base}:${serialized}` : base;
};

const get = async (cacheKey) => {
  if (!isReady()) return null;
  try {
    const raw = await client.get(cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    warnOnce("Redis read failed", err);
    return null;
  }
};

const set = async (cacheKey, value, seconds = ttl.propertyList) => {
  if (!isReady()) return false;
  try {
    await client.set(cacheKey, JSON.stringify(value), "EX", seconds);
    return true;
  } catch (err) {
    // OOM on a small plan lands here. The read still succeeded, so this is
    // only worth a warning.
    warnOnce("Redis write failed", err);
    return false;
  }
};

const del = async (...cacheKeys) => {
  if (!isReady() || cacheKeys.length === 0) return false;
  try {
    await client.del(...cacheKeys);
    return true;
  } catch (err) {
    warnOnce("Redis delete failed", err);
    return false;
  }
};

/**
 * Drops every key under a namespace, e.g. invalidate("properties") after a
 * listing is created, edited or approved.
 *
 * Uses SCAN rather than KEYS: KEYS blocks the single-threaded server for the
 * whole sweep, which on a shared plan affects every other client too.
 */
const invalidate = async (namespace) => {
  if (!isReady()) return false;
  const pattern = `${KEY_PREFIX}:${namespace}*`;
  try {
    let cursor = "0";
    do {
      const [nextCursor, batch] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      if (batch.length > 0) await client.del(...batch);
    } while (cursor !== "0");
    return true;
  } catch (err) {
    warnOnce("Redis invalidation failed", err);
    return false;
  }
};

// Namespace -> pending timer. Coalesces bursts of invalidations so a bulk
// job (the nightly NoBroker sync touching thousands of listings) triggers one
// SCAN sweep rather than one per document.
const pendingInvalidations = new Map();

/**
 * Fire-and-forget, debounced invalidation. Safe to call from a Mongoose hook:
 * it never throws and never makes the caller wait on Redis.
 */
const invalidateSoon = (namespace, delayMs = 250) => {
  if (pendingInvalidations.has(namespace)) return;

  const timer = setTimeout(() => {
    pendingInvalidations.delete(namespace);
    invalidate(namespace).catch(() => {});
  }, delayMs);

  // Don't hold the process open for a pending cache sweep.
  if (typeof timer.unref === "function") timer.unref();
  pendingInvalidations.set(namespace, timer);
};

/**
 * Read-through convenience wrapper: returns the cached value if present,
 * otherwise runs `loader`, caches its result and returns it.
 */
const remember = async (cacheKey, seconds, loader) => {
  const cached = await get(cacheKey);
  if (cached !== null) return cached;

  const value = await loader();
  if (value !== undefined && value !== null) await set(cacheKey, value, seconds);
  return value;
};

module.exports = {
  key,
  get,
  set,
  del,
  invalidate,
  invalidateSoon,
  remember,
  ttl,
  isReady,
  client,
};
