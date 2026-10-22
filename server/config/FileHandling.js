const cloudinary = require("cloudinary").v2;
const fs = require("fs");

let sharp = null;
try { sharp = require("sharp"); } catch (_) {
  console.warn("⚠️ 'sharp' not installed — large images won't be auto-compressed. Run: npm i sharp");
}

// Per-type upload targets (we will attempt to compress to these targets)
const NORMAL_MAX_BYTES = 1.5 * 1024 * 1024; // target ~1.5 MB for normal images
const PANORAMA_MAX_BYTES = 5 * 1024 * 1024;  // target ~5 MB for panorama images
// Absolute hard limit that Cloudinary rejects (>10MB previously)
const CLOUDINARY_HARD_LIMIT = 10 * 1024 * 1024; // 10 MB

// ==============================
// Cloudinary Configuration (Multi-Account with Round-Robin + Fallback)
// ==============================
// Build accounts dynamically from env so any number of accounts works
const loadAccountsFromEnv = () => {
  const env = process.env;
  const accounts = [];

  // 1) Support legacy base (no suffix) keys
  const legacyBase = env.Cloudinary_name && env.Cloudinary_api_key && env.Cloudinary_api_secret
    ? {
        cloud_name: env.Cloudinary_name,
        api_key: env.Cloudinary_api_key,
        api_secret: env.Cloudinary_api_secret,
      }
    : null;

  // 2) Collect suffixes for CLOUDINARY_ vars ("", "_2", "_3", ...)
  const suffixes = new Set();
  Object.keys(env).forEach((k) => {
    const m = k.match(/^CLOUDINARY_CLOUD_NAME(_\d+)?$/);
    if (m) suffixes.add(m[1] || "");
  });

  // 3) Build accounts from primary (CLOUDINARY_*) keys
  for (const sfx of Array.from(suffixes).sort((a,b) => {
    // sort: base "" first, then numeric order
    const ai = a ? parseInt(a.slice(1), 10) : 0;
    const bi = b ? parseInt(b.slice(1), 10) : 0;
    return ai - bi;
  })) {
    const nameKey = `CLOUDINARY_CLOUD_NAME${sfx}`;
    const keyKey = `CLOUDINARY_API_KEY${sfx}`;
    const secKey = `CLOUDINARY_API_SECRET${sfx}`;
    const cloud_name = env[nameKey];
    const api_key = env[keyKey];
    const api_secret = env[secKey];
    if (cloud_name && api_key && api_secret) {
      accounts.push({ cloud_name, api_key, api_secret });
    } else {
      if (cloud_name || api_key || api_secret) {
        console.warn(`⚠️ Incomplete Cloudinary env for suffix "${sfx}": expected ${nameKey}, ${keyKey}, ${secKey}`);
      }
    }
  }

  // 4) If no CLOUDINARY_* accounts found, fall back to legacy base
  if (accounts.length === 0 && legacyBase) accounts.push(legacyBase);

  return accounts;
};

const cloudAccounts = loadAccountsFromEnv();

if (cloudAccounts.length === 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No Cloudinary credentials found.');
  }
  console.warn('⚠️ Cloudinary credentials not configured — file uploads disabled in development');
} else {
  console.log(`🔧 Cloudinary: loaded ${cloudAccounts.length} account(s)`);
  cloudinary.config(cloudAccounts[0]);
}

// Round-robin pointer for balancing uploads
let rrIndex = 0;
const getNextStartIndex = () => {
  const idx = rrIndex;
  rrIndex = (rrIndex + 1) % cloudAccounts.length;
  return idx;
};

// Backwards-compatible alias: always uses multi-account uploader
const uploadoncloudinary = async (path, sectorOrFolder) => {
  return uploadWithFallback(path, sectorOrFolder);
};

// Ensure file is under `maxBytesTarget` where possible. If `maxBytesTarget` exceeds
// CLOUDINARY_HARD_LIMIT we still will not exceed CLOUDINARY_HARD_LIMIT.
async function ensureUnderLimit(srcPath, maxBytesTarget = CLOUDINARY_HARD_LIMIT) {
  try {
    const stat = fs.statSync(srcPath);
    const effectiveTarget = Math.min(maxBytesTarget, CLOUDINARY_HARD_LIMIT);
    if (stat.size <= effectiveTarget || !sharp) return { path: srcPath, temp: null };

    // Try progressively lower quality WebP encodes to reach effectiveTarget
    const qualities = [80, 72, 65, 58, 50, 42, 36];
    let lastTemp = null;
    for (const q of qualities) {
      if (lastTemp) { try { fs.unlinkSync(lastTemp); } catch (_) {} }
      const tempPath = srcPath.replace(/(\.[A-Za-z0-9]+)?$/, `-cmp-q${q}-${Date.now()}.webp`);
      await sharp(srcPath)
        .rotate()
        .webp({ quality: q })
        .toFile(tempPath);
      const s2 = fs.statSync(tempPath);
      if (s2.size <= effectiveTarget) {
        return { path: tempPath, temp: tempPath };
      }
      lastTemp = tempPath;
    }

    // As a fallback, try resizing width down plus a medium quality
    const tempPath = srcPath.replace(/(\.[A-Za-z0-9]+)?$/, `-cmp-resized-${Date.now()}.webp`);
    await sharp(srcPath)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(tempPath);
    const s3 = fs.statSync(tempPath);
    if (s3.size <= effectiveTarget) return { path: tempPath, temp: tempPath };

    // If still too large, return the smallest attempt anyway (lastTemp or tempPath)
    try { if (lastTemp && fs.existsSync(lastTemp)) return { path: lastTemp, temp: lastTemp }; } catch(_){}
    return { path: tempPath, temp: tempPath };
  } catch (e) {
    console.warn("ensureUnderLimit error:", e?.message || e);
    return { path: srcPath, temp: null };
  }
}

// ---------------------------------------------------------------------------------------------
// Account health and per-call credentials
// ---------------------------------------------------------------------------------------------
// Every call carries its own credentials. The global cloudinary.config() is never changed while the app is
// running, so two uploads going to two accounts at the same time can never get each other's keys.
const credentials = (i) => {
  const { cloud_name, api_key, api_secret } = cloudAccounts[i];
  return { cloud_name, api_key, api_secret };
};

// An account that just said "I cannot take this" (quota, rate limit, bad key, outage) is skipped for a while,
// so the next uploads go straight to a working account instead of failing on it first.
const COOLDOWN_MS = Number(process.env.CLOUDINARY_COOLDOWN_MS) || 10 * 60 * 1000;
const UPLOAD_TIMEOUT_MS = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS) || 60 * 1000;
const coolUntil = new Array(cloudAccounts.length).fill(0);

// true: the account is the problem (another account may well work). false: the file is the problem, and
// the same file would fail the same way anywhere.
function isAccountProblem(err) {
  const code = Number(err?.http_code || err?.statusCode || err?.error?.http_code);
  const message = String(err?.message || err?.error?.message || "");
  if ([401, 403, 420, 429].includes(code) || code >= 500) return true;
  if (/quota|rate limit|limit exceeded|over limit|plan limit|credits|storage|disabled|suspended|invalid (api|cloud)|unknown api key|api_key|cloud_name/i.test(message)) return true;
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|socket hang up|timeout/i.test(message)) return true;
  return false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Multi-account round-robin + fallback uploader
const uploadWithFallback = async (path, sectorOrFolder, preferredIndex = null, address = null) => {
  let unlinkPath = path;
  let tempToUnlink = null;
  let lastError = null;
  if (!path) {
    console.warn("[uploadWithFallback] No file path provided.");
    return null;
  }
  if (cloudAccounts.length === 0) throw new Error("No Cloudinary account is configured.");

  // Determine target sizes: panoramas get a higher target
  const baseFolder = (sectorOrFolder || 'Uncategorized').toString().replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80);
  const addressFolder = address ? address.toString().replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 80) : null;
  const folderName = addressFolder ? `${baseFolder}/${addressFolder}` : baseFolder;

  // If folderName mentions a 360 folder we treat as panorama
  const isPanorama = String(folderName).toLowerCase().includes('/360') || String(folderName).toLowerCase().endsWith('360');
  const targetMax = isPanorama ? PANORAMA_MAX_BYTES : NORMAL_MAX_BYTES;

  const cleanup = () => {
    try { if (tempToUnlink && fs.existsSync(tempToUnlink)) fs.unlinkSync(tempToUnlink); } catch (_) {}
    try { if (unlinkPath && fs.existsSync(unlinkPath) && unlinkPath !== tempToUnlink) fs.unlinkSync(unlinkPath); } catch (_) {}
  };

  try {
    const prepared = await ensureUnderLimit(path, targetMax);
    const uploadPath = prepared.path;
    tempToUnlink = prepared.temp; // cleanup after upload

    const count = cloudAccounts.length;
    const start = (Number.isInteger(preferredIndex) && preferredIndex >= 0) ? (preferredIndex % count) : getNextStartIndex();
    const order = Array.from({ length: count }, (_, k) => (start + k) % count);
    // Accounts that are not cooling down go first; if all are cooling, try them anyway.
    const healthy = order.filter((i) => coolUntil[i] <= Date.now());
    const tryOrder = healthy.length ? healthy : order;

    let fileFailures = 0;
    for (const i of tryOrder) {
      const acct = cloudAccounts[i];
      try {
        const result = await cloudinary.uploader.upload(uploadPath, {
          ...credentials(i),
          resource_type: 'auto',
          folder: `properties/${folderName}`,
          unique_filename: true,
          overwrite: false,
          timeout: UPLOAD_TIMEOUT_MS,
        });
        coolUntil[i] = 0;
        return { ...result, accountIndex: i, cloudName: acct.cloud_name };
      } catch (err) {
        lastError = err;
        if (isAccountProblem(err)) {
          coolUntil[i] = Date.now() + COOLDOWN_MS;
          console.warn(`[cloudinary] account #${i + 1} (${acct.cloud_name}) skipped for ${Math.round(COOLDOWN_MS / 60000)} min: ${err?.message || err}`);
          continue;
        }
        // Not clearly the account's fault: give the next account one chance, then stop.
        fileFailures += 1;
        if (fileFailures >= 2) break;
      }
    }
    throw lastError || new Error('Cloudinary upload failed on all configured accounts');
  } finally {
    cleanup();
  }
};

/**
 * Deletes images from Cloudinary. Starts with the account the listing was uploaded to (preferredIndex),
 * and asks the other accounts only for what was not found there, so nothing stays behind and uses up quota.
 * Returns { deleted: [ids], notFound: [ids], errors: [{ pid, error }] }.
 */
const deleteAssets = async (publicIds, preferredIndex = null, resourceType = 'image') => {
  const result = { deleted: [], notFound: [], errors: [] };
  let remaining = [...new Set((publicIds || []).filter(Boolean))];
  if (!remaining.length) return result;
  if (cloudAccounts.length === 0) {
    result.errors = remaining.map((pid) => ({ pid, error: 'No Cloudinary account is configured.' }));
    return result;
  }

  const count = cloudAccounts.length;
  const start = (Number.isInteger(preferredIndex) && preferredIndex >= 0) ? (preferredIndex % count) : 0;
  const lastError = new Map();

  for (let step = 0; step < count && remaining.length; step++) {
    const i = (start + step) % count;
    const carryOn = [];
    for (let c = 0; c < remaining.length; c += 100) { // Cloudinary takes up to 100 ids per call
      const chunk = remaining.slice(c, c + 100);
      let response = null;
      for (let attempt = 0; attempt < 3 && !response; attempt++) {
        try {
          response = await cloudinary.api.delete_resources(chunk, { ...credentials(i), resource_type: resourceType });
        } catch (err) {
          chunk.forEach((pid) => lastError.set(pid, err?.message || String(err)));
          await sleep(400 * (attempt + 1));
        }
      }
      if (!response) { carryOn.push(...chunk); continue; }
      for (const pid of chunk) {
        const outcome = response.deleted && response.deleted[pid];
        if (outcome === 'deleted' || outcome === 'ok' || outcome === 'already_deleted') { result.deleted.push(pid); lastError.delete(pid); }
        else carryOn.push(pid); // not here (or not deletable here): ask the next account
      }
    }
    remaining = carryOn;
  }

  for (const pid of remaining) {
    if (lastError.has(pid)) result.errors.push({ pid, error: lastError.get(pid) });
    else result.notFound.push(pid);
  }
  return result;
};

// For health checks and the admin usage page: which accounts exist and which are resting. No secrets.
const accountsStatus = () => cloudAccounts.map((acct, i) => ({
  index: i,
  cloudName: acct.cloud_name,
  resting: coolUntil[i] > Date.now(),
  restingSeconds: Math.max(0, Math.round((coolUntil[i] - Date.now()) / 1000)),
}));

module.exports = { uploadoncloudinary, uploadWithFallback, deleteAssets, accountsStatus, credentialsFor: credentials, accountCount: () => cloudAccounts.length };
