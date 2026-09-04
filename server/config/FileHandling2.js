'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const cloudinary = require('cloudinary').v2;
let sharp = null;
try { sharp = require('sharp'); } catch (_) { console.warn("⚠️ 'sharp' not installed — image compression disabled. Install with: npm i sharp"); }

// Strict max target for agent uploads: 1 MB
const NORMAL_MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const CLOUDINARY_HARD_LIMIT = 10 * 1024 * 1024; // Cloudinary hard reject >10MB (kept as upper safety)

// -------------------------
// Load multiple Agent Cloudinary accounts from env
// Pattern supported:
// AGENT_CLOUDINARY_CLOUD_NAME, AGENT_CLOUDINARY_API_KEY, AGENT_CLOUDINARY_API_SECRET
// AGENT_CLOUDINARY_CLOUD_NAME_2, AGENT_CLOUDINARY_API_KEY_2, AGENT_CLOUDINARY_API_SECRET_2, etc.
// Fallback: if none are present, falls back to CLOUDINARY_* env vars (legacy)
// -------------------------
function loadAgentAccountsFromEnv() {
  const env = process.env;
  const accounts = [];

  const suffixes = new Set();
  Object.keys(env).forEach((k) => {
    const m = k.match(/^AGENT_CLOUDINARY_CLOUD_NAME(_\d+)?$/);
    if (m) suffixes.add(m[1] || '');
  });

  for (const sfx of Array.from(suffixes).sort((a,b) => {
    const ai = a ? parseInt(a.slice(1), 10) : 0;
    const bi = b ? parseInt(b.slice(1), 10) : 0;
    return ai - bi;
  })) {
    const nameKey = `AGENT_CLOUDINARY_CLOUD_NAME${sfx}`;
    const keyKey = `AGENT_CLOUDINARY_API_KEY${sfx}`;
    const secKey = `AGENT_CLOUDINARY_API_SECRET${sfx}`;
    const cloud_name = env[nameKey];
    const api_key = env[keyKey];
    const api_secret = env[secKey];
    if (cloud_name && api_key && api_secret) {
      accounts.push({ cloud_name, api_key, api_secret });
    } else if (cloud_name || api_key || api_secret) {
      console.warn(`⚠️ Incomplete Agent Cloudinary env for suffix "${sfx}" — expected ${nameKey}, ${keyKey}, ${secKey}`);
    }
  }

  return accounts;
}

const cloudAccounts = loadAgentAccountsFromEnv();
if (!cloudAccounts || cloudAccounts.length === 0) {
  console.warn('⚠️ No Agent Cloudinary credentials found (AGENT_CLOUDINARY_* or fallback CLOUDINARY_*). Cloud uploads will fail.');
} else {
  // configure initial account
  cloudinary.config(cloudAccounts[0]);
  console.log(`🔧 Agent Cloudinary: loaded ${cloudAccounts.length} account(s)`);
}

// Round-robin index
let rrIndex = 0;
const getNextStartIndex = () => { const idx = rrIndex; rrIndex = (rrIndex + 1) % cloudAccounts.length; return idx; };

// -------------------------
// Compression helper (uses sharp if available)
// For images we try to bring them under NORMAL_MAX_BYTES; for non-images (PDF/DOC) we skip compression
// -------------------------
async function ensureUnderLimit(srcPath, maxBytesTarget = NORMAL_MAX_BYTES) {
  try {
    const ext = String(path.extname(srcPath) || '').toLowerCase();
    const nonCompressExts = ['.pdf', '.doc', '.docx', '.txt'];
    // if non-image or sharp unavailable -> skip compression
    if (nonCompressExts.includes(ext) || !sharp) {
      return { path: srcPath, temp: null };
    }

    const stat = fs.statSync(srcPath);
    const effectiveTarget = Math.min(maxBytesTarget, CLOUDINARY_HARD_LIMIT);
    if (stat.size <= effectiveTarget) return { path: srcPath, temp: null };

    const qualities = [80,72,65,58,50,42,36];
    let lastTemp = null;
    for (const q of qualities) {
      if (lastTemp) { try { fs.unlinkSync(lastTemp); } catch(_){} }
      const tempPath = srcPath.replace(/(\.[A-Za-z0-9]+)?$/, `-cmp-q${q}-${Date.now()}.webp`);
      await sharp(srcPath).rotate().webp({ quality: q }).toFile(tempPath);
      const s2 = fs.statSync(tempPath);
      if (s2.size <= effectiveTarget) return { path: tempPath, temp: tempPath };
      lastTemp = tempPath;
    }

    const tempPath = srcPath.replace(/(\.[A-Za-z0-9]+)?$/, `-cmp-resized-${Date.now()}.webp`);
    await sharp(srcPath).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 60 }).toFile(tempPath);
    const s3 = fs.statSync(tempPath);
    if (s3.size <= effectiveTarget) return { path: tempPath, temp: tempPath };

    if (lastTemp && fs.existsSync(lastTemp)) return { path: lastTemp, temp: lastTemp };
    return { path: tempPath, temp: tempPath };
  } catch (e) {
    console.warn('ensureUnderLimit error:', e?.message || e);
    return { path: srcPath, temp: null };
  }
}

// -------------------------
// Upload to Cloudinary with round-robin + fallback
// -------------------------
async function uploadWithFallbackAgent(localPath, folder = 'agents', preferredIndex = null, subfolder = null) {
  if (!localPath) throw new Error('No localPath passed to uploadWithFallbackAgent');

  const baseFolder = String(folder || 'agents').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0,80);
  const extra = subfolder ? String(subfolder).replace(/[^a-zA-Z0-9-_]/g, '_').substring(0,80) : null;
  const folderName = extra ? `${baseFolder}/${extra}` : baseFolder;

  // For agent images/id proofs always target NORMAL_MAX_BYTES
  const targetMax = NORMAL_MAX_BYTES;

  const prepared = await ensureUnderLimit(localPath, targetMax);
  const uploadPath = prepared.path;
  const tempToUnlink = prepared.temp;

  const attempts = Math.max(1, cloudAccounts.length);
  const start = (Number.isInteger(preferredIndex) && preferredIndex >= 0) ? (preferredIndex % attempts) : (cloudAccounts.length ? getNextStartIndex() : 0);
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const i = (start + attempt) % attempts;
    const acct = cloudAccounts[i];
    try {
      if (acct) cloudinary.config(acct);
      const result = await cloudinary.uploader.upload(uploadPath, {
        resource_type: 'auto',
        folder: folderName,
        unique_filename: true,
        overwrite: false
      });

      // cleanup temp and local after success (best-effort)
      try { if (tempToUnlink && fs.existsSync(tempToUnlink)) fs.unlinkSync(tempToUnlink); } catch(_){}
      try { if (localPath && fs.existsSync(localPath) && localPath !== tempToUnlink) fs.unlinkSync(localPath); } catch(_){}

      return { ...result, accountIndex: i, cloudName: acct ? acct.cloud_name : undefined };
    } catch (err) {
      lastError = err;
    }
  }

  try { if (tempToUnlink && fs.existsSync(tempToUnlink)) fs.unlinkSync(tempToUnlink); } catch(_){}
  throw lastError || new Error('Cloudinary upload failed on all configured agent accounts');
}

// -------------------------
// Multer temporary storage for only allowed fields (profilePhoto + idProof)
// Files will be placed in OS tmp directory under a subfolder
// -------------------------
const TMP_DIR = path.join(os.tmpdir(), 'ggnhome-agent-uploads');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const multer = require('multer');
const storageTmp = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${file.fieldname}-${safeName}`);
  }
});

// Only accept two fields: profilePhoto (image/*) and idProof (image/* or application/pdf)
// Enforce max size 1 MB per file and restrict types: profilePhoto => JPG/JPEG, idProof => JPG/PDF/DOC/DOCX
const uploadMiddleware = multer({
  storage: storageTmp,
  limits: { fileSize: NORMAL_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const allowedFields = ['profilePhoto','idProof'];
    if (!allowedFields.includes(file.fieldname)) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    const mimetype = file.mimetype;
    if (file.fieldname === 'profilePhoto') {
      if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return cb(null, true);
      return cb(new Error('profilePhoto must be a JPG/JPEG image'));
    }
    if (file.fieldname === 'idProof') {
      const allowed = [ 'image/jpeg', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ];
      if (allowed.includes(mimetype)) return cb(null, true);
      return cb(new Error('idProof must be JPG, PDF, or DOC/DOCX'));
    }
    return cb(null, false);
  }
}).fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'idProof', maxCount: 3 }
]);

// -------------------------
// Public functions
// -------------------------

/**
 * Middleware to use in routes to accept only profilePhoto & idProof files
 */
function uploadAgentFilesMiddleware(req, res, next) {
  return uploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    return next();
  });
}

/**
 * Uploads the profilePhoto and idProof(s) found in req.files to agent Cloudinary accounts.
 * Uses req.body.agentCode or req.agentCode as subfolder when present, else falls back to email localpart or timestamp.
 * Returns an object: { profilePhoto: cloudResult | null, idProofs: [cloudResults...] }
 */
async function uploadAgentFilesToCloud(req) {
  if (!req || !req.files) throw new Error('req.files required');

  const profileFile = req.files.profilePhoto ? req.files.profilePhoto[0] : null;
  const idFiles = req.files.idProof ? req.files.idProof : [];

  if (!profileFile && idFiles.length === 0) return { profilePhoto: null, idProofs: [] };

  const agentCode =
    (req.body && req.body.agentCode) ||
    req.agentCode;

  if (!agentCode) {
    throw new Error("agentCode is required before uploading agent files");
  }

  const subfolder = String(agentCode)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 80);

  const results = { profilePhoto: null, idProofs: [] };

  try {
    if (profileFile) {
      const r = await uploadWithFallbackAgent(profileFile.path, 'Agents', null, subfolder);
      results.profilePhoto = r;
    }

    if (idFiles && idFiles.length > 0) {
      for (const f of idFiles) {
        const r = await uploadWithFallbackAgent(f.path, 'Agents', null, subfolder);
        results.idProofs.push(r);
      }
    }

    return results;
  } finally {
    try { if (profileFile && fs.existsSync(profileFile.path)) fs.unlinkSync(profileFile.path); } catch(_){ }
    try { if (idFiles && idFiles.length) idFiles.forEach(f=>{ try{ if (fs.existsSync(f.path)) fs.unlinkSync(f.path); }catch(_){ } }); } catch(_){ }
  }
}

module.exports = {
  uploadAgentFilesMiddleware,
  uploadAgentFilesToCloud,
  _internal: { uploadWithFallbackAgent, ensureUnderLimit, loadAgentAccountsFromEnv }
};
