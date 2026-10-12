const AppDownload = require("../models/AppDownload.model");

const DEFAULTS = [
  { key: "ggnhome", name: "GgnHome", description: "Main GgnHome Android app" },
  { key: "partner", name: "GgnHome-Partner", description: "Partner portal Android app" },
  { key: "sms-service", name: "sms-service", description: "SMS service Android app" },
];

async function getAppDownloads(req, res) {
  try {
    const stored = await AppDownload.find({ key: { $in: DEFAULTS.map(x => x.key) } }).lean();
    const byKey = new Map(stored.map(x => [x.key, x]));
    return res.json(DEFAULTS.map(item => {
      const row = byKey.get(item.key);
      return { ...item, url: row?.url || "", version: row?.version || "", updatedAt: row?.updatedAt || null };
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

module.exports = { getAppDownloads, updateAppDownloads };
