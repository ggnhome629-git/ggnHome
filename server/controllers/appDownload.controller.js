const AppDownload = require("../models/AppDownload.model");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

// The four Android apps. Each is built by .github/workflows/build-all-apks.yml and published to the
// "latest-apks" GitHub release under `file`. Everyone downloads through this API
// (/api/app-downloads/<file>), so no one lands on a GitHub page and the link never changes.
const RELEASE_BASE = "https://github.com/ggnhome629-git/ggnHome/releases/download/latest-apks";
const RELEASE_VERSION = "1.0.0";

const APPS = [
  { key: "ggnhome", name: "GgnHome", description: "GgnHome for people who search, rent or buy property", file: "GgnHome.apk" },
  { key: "partner", name: "GgnHome Partner", description: "Partner portal: add properties, leads and enquiries", file: "GgnHome-Partner.apk" },
  { key: "admin", name: "GgnHome Admin", description: "Admin portal for the GgnHome team", file: "GgnHome-Admin.apk" },
  { key: "sms-service", name: "SMS Service", description: "SMS gateway and OTP viewer for the GgnHome team", file: "sms-service.apk" },
];
const byFile = new Map(APPS.map((app) => [app.file.toLowerCase(), app]));
// Short and older links keep working.
byFile.set("partner.apk", APPS.find((a) => a.key === "partner"));
byFile.set("admin.apk", APPS.find((a) => a.key === "admin"));

const defaultSource = (app) => `${RELEASE_BASE}/${app.file}`;
// A saved source is used only if it is a GgnHome GitHub release asset with the same file name.
const isApprovedSource = (app, value) =>
  new RegExp(`^https://github\\.com/ggnhome629-git/ggnHome/releases/download/[^/]+/${app.file.replace(/\./g, "\\.")}$`, "i").test(String(value || ""));

const publicBase = (req) => String(process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

async function getAppDownloads(req, res) {
  try {
    const stored = await AppDownload.find({ key: { $in: APPS.map((x) => x.key) } }).lean();
    const byKey = new Map(stored.map((x) => [x.key, x]));
    const isAdminRequest = String(req.path || "").startsWith("/api/admin/");
    const base = publicBase(req);
    return res.json(APPS.map(({ file, ...app }) => {
      const row = byKey.get(app.key);
      return {
        ...app,
        file,
        // Admin sees the saved override (empty = the latest release); everyone else gets the API download link.
        url: isAdminRequest ? (row?.url || "") : `${base}/api/app-downloads/${file}`,
        version: row?.version || RELEASE_VERSION,
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
      const app = item && APPS.find((x) => x.key === item.key);
      if (!app) continue;
      const url = String(item.url || "").trim();
      if (url && !/^https:\/\//i.test(url)) {
        return res.status(400).json({ message: "Download URLs must use HTTPS." });
      }
      const version = String(item.version || "").trim().slice(0, 40);
      const { file, ...fields } = app;
      await AppDownload.findOneAndUpdate(
        { key: item.key },
        { $set: { ...fields, url, version, updatedBy: req.user?._id || null } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }
    const saved = await AppDownload.find({ key: { $in: APPS.map((x) => x.key) } }).lean();
    const byKey = new Map(saved.map((x) => [x.key, x]));
    return res.json({
      message: "App download links saved.",
      apps: APPS.map(({ file, ...app }) => ({ ...app, file, url: byKey.get(app.key)?.url || "", version: byKey.get(app.key)?.version || RELEASE_VERSION })),
    });
  } catch (error) {
    console.error("updateAppDownloads error:", error);
    return res.status(500).json({ message: "Could not save app download links." });
  }
}

// GET /api/app-downloads/:file  e.g. GgnHome.apk, GgnHome-Partner.apk, GgnHome-Admin.apk, sms-service.apk
async function downloadApk(req, res) {
  const unavailable = "This app is temporarily unavailable. Please try again later.";
  try {
    const app = byFile.get(String(req.params.file || "").toLowerCase());
    if (!app) return res.status(404).json({ message: "Unknown app." });

    const saved = await AppDownload.findOne({ key: app.key }).select("url").lean();
    // PARTNER_APK_SOURCE_URL is kept for existing deployments.
    const configured = (app.key === "partner" && process.env.PARTNER_APK_SOURCE_URL) || saved?.url || "";
    // An admin may point an app at their own HTTPS host (for example a CDN): send people there.
    if (configured && !isApprovedSource(app, configured)) {
      if (/^https:\/\//i.test(configured)) return res.redirect(302, configured);
    }
    const source = isApprovedSource(app, configured) ? configured : defaultSource(app);

    const upstream = await fetch(source, { redirect: "follow", signal: AbortSignal.timeout(25000) });
    if (!upstream.ok || !upstream.body) return res.status(502).json({ message: unavailable });

    res.status(200);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${app.file}"`);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const length = upstream.headers.get("content-length");
    if (length && /^\d+$/.test(length)) res.setHeader("Content-Length", length);
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    console.error("[apk download] failed:", error.message);
    if (!res.headersSent) res.status(502).json({ message: unavailable });
    else res.destroy(error);
  }
}

module.exports = { getAppDownloads, updateAppDownloads, downloadApk, downloadPartnerApk: downloadApk, APPS };
