/**
 * Routes that exist only for the GgnHome Android app (mounted at /api/app).
 * The app's WebView appends "GgnHomeApp" to its user agent; requests without
 * it are rejected so these features stay app-only.
 */
const express = require("express");
const router = express.Router();
const DeviceToken = require("../models/DeviceToken.model");
const { verifyToken, verifyTokenOptional } = require("../middleware/auth");
const { checkAdminEmail } = require("../middleware/adminOnly");
const { getRecommendations } = require("../services/appRecommender");
const { runPopularPush, runPersonalPush } = require("../jobs/popularPush");
const push = require("../services/push");

const appOnly = (req, res, next) => {
  if (/GgnHomeApp/i.test(req.get("user-agent") || "")) return next();
  return res.status(403).json({ code: "APP_ONLY", message: "This feature is available in the GgnHome app." });
};

// ---- Devices (push registration) --------------------------------------
router.post("/devices", appOnly, verifyTokenOptional, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (token.length < 20 || token.length > 4096) return res.status(400).json({ message: "Invalid device token" });
    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      {
        $set: {
          platform: "android",
          appVersion: String(req.body?.appVersion || "").slice(0, 20),
          lastSeenAt: new Date(),
          ...(req.user ? { userId: req.user._id } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, popularPushes: doc.popularPushes, personalPushes: doc.personalPushes });
  } catch (err) {
    res.status(500).json({ message: "Could not register device" });
  }
});

router.patch("/devices/prefs", appOnly, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const set = {};
    if (typeof req.body?.popularPushes === "boolean") set.popularPushes = req.body.popularPushes;
    if (typeof req.body?.personalPushes === "boolean") set.personalPushes = req.body.personalPushes;
    const doc = await DeviceToken.findOneAndUpdate({ token }, { $set: set }, { new: true });
    if (!doc) return res.status(404).json({ message: "Device not registered" });
    res.json({ success: true, popularPushes: doc.popularPushes, personalPushes: doc.personalPushes });
  } catch (err) {
    res.status(500).json({ message: "Could not update preferences" });
  }
});

router.delete("/devices", appOnly, async (req, res) => {
  try {
    await DeviceToken.deleteOne({ token: String(req.body?.token || "") });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Could not remove device" });
  }
});

// ---- Recommendations ---------------------------------------------------
// GET /api/app/recommendations?type=all|rental|sale&limit=20&recent=<id>:<rental|sale>,...
router.get("/recommendations", appOnly, verifyTokenOptional, async (req, res) => {
  try {
    const type = ["rental", "sale"].includes(req.query.type) ? req.query.type : "all";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 40);
    const recent = String(req.query.recent || "")
      .split(",")
      .map((s) => s.split(":"))
      .filter(([id, t]) => /^[a-f\d]{24}$/i.test(id || "") && ["rental", "sale"].includes(t))
      .map(([id, t]) => ({ id, type: t }));
    const data = await getRecommendations({ userId: req.user ? String(req.user._id) : null, recent, type, limit });
    res.set("Cache-Control", "private, max-age=120");
    res.json({ success: true, ...data, generatedAt: new Date() });
  } catch (err) {
    console.error("[app recommendations]", err);
    res.status(500).json({ success: false, message: "Could not load recommendations" });
  }
});

// ---- Admin / cron triggers ---------------------------------------------
router.get("/push/status", verifyToken, checkAdminEmail, async (req, res) => {
  const [devices, loggedIn] = await Promise.all([DeviceToken.countDocuments(), DeviceToken.countDocuments({ userId: { $ne: null } })]);
  res.json({ configured: push.isConfigured(), devices, loggedIn });
});

router.post("/push/popular", verifyToken, checkAdminEmail, async (req, res) => {
  try {
    res.json(await runPopularPush({ dryRun: Boolean(req.body?.dryRun) }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/push/personal", verifyToken, checkAdminEmail, async (req, res) => {
  try {
    res.json(await runPersonalPush());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
