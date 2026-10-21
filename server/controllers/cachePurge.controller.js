const crypto = require("crypto");
const axios = require("axios");
const SiteCacheVersion = require("../models/SiteCacheVersion.model");
const appCache = require("../config/cache");

// Only these origins may be purged by URL; everything else is rejected.
const ALLOWED_ORIGINS = ["https://www.ggnhome.com", "https://ggnhome.com"];
const MAX_FILES = 30;

function secretMatches(provided) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Browser cache version -------------------------------------------------
// Every visitor's browser asks for this number. When it changes, the browser
// clears its own caches (service worker + cache storage) and refreshes.

const VERSION_CACHE_MS = 10 * 1000; // per-instance, keeps the check cheap
const versionCache = new Map(); // key -> { version, at }

async function readVersion(key = "site") {
  const hit = versionCache.get(key);
  if (hit && Date.now() - hit.at < VERSION_CACHE_MS) return hit.version;
  const doc = await SiteCacheVersion.findOne({ key }).select("version").lean();
  const version = doc ? doc.version : 0;
  versionCache.set(key, { version, at: Date.now() });
  return version;
}

async function bumpVersion(key = "site", userId = null) {
  const doc = await SiteCacheVersion.findOneAndUpdate(
    { key },
    { $set: { version: Date.now(), updatedBy: userId || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  versionCache.set(key, { version: doc.version, at: Date.now() });
  return doc.version;
}

// GET /api/cache-version -> { version }. Public and never cached.
exports.getCacheVersion = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    return res.json({ version: await readVersion() });
  } catch (err) {
    return res.status(500).json({ message: "Could not read the cache version." });
  }
};

// ---- Cloudflare ------------------------------------------------------------

// Returns { configured, success, purged, errors }. Never throws.
async function purgeCloudflare(payload) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    return { configured: false, success: false, errors: ["Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID on the API service."] };
  }
  try {
    const { data } = await axios.post(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, payload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    return {
      configured: true,
      success: Boolean(data?.success),
      purged: payload.purge_everything ? "everything" : payload.files,
      errors: (data?.errors || []).map((e) => e.message || String(e)),
    };
  } catch (err) {
    const errors = err.response?.data?.errors;
    return { configured: true, success: false, errors: (errors && errors.length ? errors.map((e) => e.message || String(e)) : [err.message]) };
  }
}

// ---- Redis (server-side read cache) ------------------------------------------

// Deletes only the app's own cache keys ("ggnhome:*"), never the rate-limit
// counters or the voice queue that share the same Redis. Never throws.
async function clearRedisCache() {
  const configured = Boolean(process.env.REDIS_URI || process.env.REDIS_URL);
  if (!configured) return { configured: false, cleared: false };
  if (!appCache.isReady()) return { configured: true, cleared: false, error: "Redis is not connected right now." };
  try {
    return { configured: true, cleared: (await appCache.invalidate("")) === true };
  } catch (err) {
    return { configured: true, cleared: false, error: err.message };
  }
}

/**
 * Clear everything in one click:
 *   1. bump the browser cache version (every visitor's browser then wipes its own caches)
 *   2. clear the server's Redis read cache
 *   3. purge Cloudflare
 * The three are independent, so each still runs if another is not connected yet.
 * Body: {} clears all; { files: [urls] } limits the Cloudflare purge to those URLs;
 * { browsers: false } / { redis: false } skip those parts.
 */
async function clearAllCaches(req, res) {
  const files = req.body?.files;
  let payload = { purge_everything: true };
  if (files !== undefined) {
    const valid =
      Array.isArray(files) &&
      files.length > 0 &&
      files.length <= MAX_FILES &&
      files.every((f) => typeof f === "string" && ALLOWED_ORIGINS.some((o) => f === o || f.startsWith(`${o}/`)));
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `files must be 1 to ${MAX_FILES} URLs on ${ALLOWED_ORIGINS.join(" or ")}.`,
      });
    }
    payload = { files };
  }

  const refreshBrowsers = req.body?.browsers !== false;
  let browsers = { refreshed: false };
  if (refreshBrowsers) {
    try {
      browsers = { refreshed: true, version: await bumpVersion("site", req.user?._id) };
    } catch (err) {
      console.error("bumpVersion failed:", err.message);
      browsers = { refreshed: false, error: "Could not save the new cache version." };
    }
  }

  const [cloudflare, redis] = await Promise.all([
    purgeCloudflare(payload),
    req.body?.redis === false ? Promise.resolve({ configured: false, cleared: false, skipped: true }) : clearRedisCache(),
  ]);
  const success = browsers.refreshed || cloudflare.success || redis.cleared;
  const parts = [];
  if (browsers.refreshed) parts.push("visitors' browsers will refresh within minutes");
  if (redis.cleared) parts.push("server (Redis) cache cleared");
  else if (!redis.configured && !redis.skipped) parts.push("Redis is not connected");
  else if (redis.error) parts.push("Redis could not be cleared");
  if (cloudflare.success) parts.push("Cloudflare cache purged");
  else if (!cloudflare.configured) parts.push("Cloudflare is not connected");
  else parts.push("Cloudflare rejected the purge");

  return res.status(success ? 200 : 502).json({
    success,
    message: parts.join("; ") + ".",
    browsers,
    redis,
    cloudflare,
  });
}

// POST /api/admin/cache/purge — signed-in admin (verifyToken + checkAdminEmail on the route).
exports.adminPurgeCache = clearAllCaches;

// POST /api/cron/purge-cache — for Postman or scripts. Needs the x-cron-secret header (same value as CRON_SECRET).
exports.secretPurgeCache = (req, res) => {
  if (!secretMatches(req.headers["x-cron-secret"])) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return clearAllCaches(req, res);
};

exports._internals = { bumpVersion, readVersion };
