const crypto = require("crypto");
const axios = require("axios");

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

/** Purge the Cloudflare cache for the site. Body: {} purges everything, { files: [urls] } purges those URLs. */
async function purgeCloudflare(req, res) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    return res.status(503).json({
      success: false,
      message: "Cache purge is not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID on the API service.",
    });
  }

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

  try {
    const { data } = await axios.post(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, payload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.json({
      success: Boolean(data?.success),
      purged: payload.purge_everything ? "everything" : payload.files,
      cloudflare: { id: data?.result?.id || null, errors: data?.errors || [] },
    });
  } catch (err) {
    const cf = err.response?.data;
    return res.status(502).json({
      success: false,
      message: "Cloudflare rejected the purge request.",
      cloudflare: { errors: cf?.errors || [{ message: err.message }] },
    });
  }
}

// POST /api/admin/cache/purge — signed-in admin (verifyToken + checkAdminEmail on the route).
exports.adminPurgeCache = purgeCloudflare;

// POST /api/cron/purge-cache — for Postman or scripts. Needs the x-cron-secret header (same value as CRON_SECRET).
exports.secretPurgeCache = (req, res) => {
  if (!secretMatches(req.headers["x-cron-secret"])) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return purgeCloudflare(req, res);
};
