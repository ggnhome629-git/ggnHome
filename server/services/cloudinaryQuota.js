/**
 * Cloudinary free-tier guard shared by user and agent upload paths.
 *
 * The provider's credits combine storage, bandwidth and transformations, so
 * upload bytes alone cannot guarantee staying under the monthly allowance.
 * Refresh usage at least once/minute and after a small number of uploads.
 * Fail closed when the usage endpoint is unavailable or returns no usable data.
 */
const cloudinary = require("cloudinary").v2;

const CACHE_MS = 60 * 1000;
const REFRESH_AFTER_UPLOADS = 3;
const MAX_CREDIT_USAGE_PERCENT = Math.min(
  80,
  Math.max(50, Number.parseInt(process.env.CLOUDINARY_SOFT_LIMIT_PERCENT || "80", 10) || 80)
);
const cache = new Map();

function deriveCredits(usage) {
  const creditsUsed = Number(usage?.credits?.usage);
  const creditsLimit = Number(usage?.credits?.limit);
  if (Number.isFinite(creditsUsed) && Number.isFinite(creditsLimit) && creditsLimit > 0) {
    return { used: creditsUsed, limit: creditsLimit };
  }
  const storage = Number(usage?.storage?.usage);
  const bandwidth = Number(usage?.bandwidth?.usage);
  const transformations = Number(usage?.transformations?.usage);
  if (![storage, bandwidth, transformations].every(Number.isFinite)) return null;
  return {
    used: storage / (1024 ** 3) + bandwidth / (1024 ** 3) + transformations / 1000,
    limit: Number.isFinite(creditsLimit) && creditsLimit > 0 ? creditsLimit : 25,
  };
}

async function assertCloudinaryHeadroom(account) {
  if (!account?.cloud_name || !account?.api_key || !account?.api_secret) {
    throw new Error("Cloudinary quota guard: account credentials are incomplete.");
  }
  const key = account.cloud_name;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now && cached.uploadsSinceCheck < REFRESH_AFTER_UPLOADS) {
    if (cached.used / cached.limit * 100 >= MAX_CREDIT_USAGE_PERCENT) {
      throw new Error("Cloudinary usage reached the free-tier safety threshold. Upload paused.");
    }
    return;
  }

  cloudinary.config(account);
  let usage;
  try {
    usage = await cloudinary.api.usage();
  } catch (err) {
    throw new Error("Cloudinary usage could not be verified; upload paused to protect the free-tier quota.");
  }
  const credits = deriveCredits(usage);
  if (!credits || credits.limit <= 0) {
    throw new Error("Cloudinary usage response was incomplete; upload paused to protect the free-tier quota.");
  }
  const next = {
    used: credits.used,
    limit: credits.limit,
    expiresAt: now + CACHE_MS,
    uploadsSinceCheck: 0,
  };
  cache.set(key, next);
  if (next.used / next.limit * 100 >= MAX_CREDIT_USAGE_PERCENT) {
    throw new Error("Cloudinary usage reached the free-tier safety threshold. Upload paused.");
  }
}

function recordCloudinaryUpload(account) {
  const key = account?.cloud_name;
  const cached = key ? cache.get(key) : null;
  if (cached) cached.uploadsSinceCheck += 1;
}

module.exports = { assertCloudinaryHeadroom, recordCloudinaryUpload };
