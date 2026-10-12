const AppDownload = require("../models/AppDownload.model");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const DEFAULT_PARTNER_APK = "https://github.com/ggnhome629-git/ggnHome/releases/download/latest-apks/GgnHome-Partner.apk";
const isApprovedPartnerApkUrl = (value) => /^https:\/\/github\.com\/ggnhome629-git\/ggnHome\/releases\/download\/[^/]+\/GgnHome-Partner\.apk$/i.test(String(value || ""));

const DEFAULTS = [
  { key: "ggnhome", name: "GgnHome", description: "Main GgnHome Android app" },
  { key: "partner", name: "GgnHome-Partner", description: "Partner portal Android app" },
  { key: "sms-service", name: "sms-service", description: "SMS service Android app" },
];

async function getAppDownloads(req, res) {
  try {
    const stored = await AppDownload.find({ key: { $in: DEFAULTS.map(x => x.key) } }).lean();
    const byKey = new Map(stored.map(x => [x.key, x]));
    const isAdminRequest = String(req.path || "").startsWith("/api/admin/");
    const publicApiBase = String(process.env.PUBLIC_API_BASE_URL || (req.protocol + "://" + req.get("host"))).replace(/\/+$/, "");
    return res.json(DEFAULTS.map(item => {
      const row = byKey.get(item.key);
      const directPartnerUrl = publicApiBase + "/api/app-downloads/partner.apk";
      return {
        ...item,
        url: item.key === "partner" && !isAdminRequest ? directPartnerUrl : (row?.url || ""),
        version: row?.version || "",
        updatedAt: row?.updatedAt || null,
      };
    }));
  } catch (error) {
    console.error("getAppDownloads error:", error);
    return res.status(500).json({ message: "Could not load app download links." });
  }
}

async function updateAppDownloads(req, res) {
  try {
    const updates = req.body?.apps;
    if (!Array.isArray(updates)) return res.status(400).json({ message: "apps must be an array." });
    for (const item of updates) {
      if (!item || !DEFAULTS.some(d => d.key === item.key)) continue;
      const url = String(item.url || "").trim();
      if (url && !/^https:\/\//i.test(url)) {
        return res.status(400).json({ message: "Download URLs must use HTTPS." });
      }
      const version = String(item.version || "").trim().slice(0, 40);
      await AppDownload.findOneAndUpdate(
        { key: item.key },
        { $set: { ...DEFAULTS.find(d => d.key === item.key), url, version, updatedBy: req.user?._id || null } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }
    const response = await AppDownload.find({ key: { $in: DEFAULTS.map(x => x.key) } }).lean();
    const byKey = new Map(response.map(x => [x.key, x]));
    return res.json({ message: "App download links saved.", apps: DEFAULTS.map(x => ({ ...x, url: byKey.get(x.key)?.url || "", version: byKey.get(x.key)?.version || "" })) });
  } catch (error) {
    console.error("updateAppDownloads error:", error);
    return res.status(500).json({ message: "Could not save app download links." });
  }
}

async function downloadPartnerApk(req, res) {
  try {
    const saved = await AppDownload.findOne({ key: "partner" }).select("url").lean();
    const configured = process.env.PARTNER_APK_SOURCE_URL || saved?.url || DEFAULT_PARTNER_APK;
    const source = isApprovedPartnerApkUrl(configured) ? configured : DEFAULT_PARTNER_APK;
    const upstream = await fetch(source, { redirect: "follow", signal: AbortSignal.timeout(25000) });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ message: "The latest Partner APK is temporarily unavailable. Please try again later." });
    }
    res.status(200);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="GgnHome-Partner.apk"');
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const length = upstream.headers.get("content-length");
    if (length && /^\d+$/.test(length)) res.setHeader("Content-Length", length);
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    console.error("[partner apk download] failed:", error.message);
    if (!res.headersSent) res.status(502).json({ message: "The latest Partner APK is temporarily unavailable. Please try again later." });
    else res.destroy(error);
  }
}

module.exports = { getAppDownloads, updateAppDownloads, downloadPartnerApk };
