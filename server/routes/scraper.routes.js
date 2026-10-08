/**
 * Scraper Routes
 * Admin-only endpoints for managing scraper operations
 */

const express = require("express");
const router = express.Router();
const Joi = require("joi");

const scraperController = require("../controllers/scraper.controller");
const { verifyToken } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { apiLimiter } = require("../middleware/rateLimit");
const User = require("../models/user.model.js");

// Admin check middleware
const checkAdminEmail = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: No user data found" });
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin scraper rate limiter (more lenient than general API)
const scraperLimiter = require("express-rate-limit")({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: "Too many scraper requests",
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Validation schemas
 */
const startScraperSchema = Joi.object({
  source: Joi.string().valid("nobroker", "99acres", "all").default("all"),
});

const updateScheduleSchema = Joi.object({
  cron: Joi.string()
    .required()
    .pattern(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
    .messages({
      "string.pattern.base": "Invalid cron expression format",
    }),
});

/**
 * Routes - All require admin authentication
 */

/**
 * POST /api/admin/scraper/run
 * Start a scraping job
 * Admin only
 */
router.post(
  "/run",
  verifyToken, checkAdminEmail,
  scraperLimiter,
  validate(startScraperSchema, "body"),
  scraperController.startScraper
);

/**
 * GET /api/admin/scraper/status
 * Get current scraper status
 * Admin only
 */
router.get(
  "/status",
  verifyToken, checkAdminEmail,
  scraperController.getStatus
);

/**
 * POST /api/admin/scraper/stop
 * Stop current scraping job
 * Admin only
 */
router.post(
  "/stop",
  verifyToken, checkAdminEmail,
  scraperLimiter,
  scraperController.stopScraper
);

/**
 * GET /api/admin/scraper/logs
 * Get scraper logs
 * Admin only, query limit (max 1000)
 */
router.get(
  "/logs",
  verifyToken, checkAdminEmail,
  scraperController.getLogs
);

/**
 * PATCH /api/admin/scraper/schedule
 * Update scraper schedule (cron expression)
 * Admin only
 */
router.patch(
  "/schedule",
  verifyToken, checkAdminEmail,
  validate(updateScheduleSchema, "body"),
  scraperController.updateSchedule
);

/**
 * NoBroker listing sync (daily 3:30 AM IST) - toggle + last run, controlled from the admin panel.
 */
const nbSync = () => require("../cron/nobrokerSyncCron");
let nbSyncRunning = false;

router.get("/nobroker-sync", verifyToken, checkAdminEmail, async (req, res, next) => {
  try {
    const AppSetting = require("../models/AppSetting.model");
    const { isSyncEnabled, SETTING_KEY } = nbSync();
    const s = await AppSetting.findOne({ key: SETTING_KEY }).lean();
    res.json({ success: true, data: { enabled: await isSyncEnabled(), running: nbSyncRunning, schedule: "Daily 3:30 AM IST", lastRun: s?.value?.lastRun || null } });
  } catch (e) { next(e); }
});

router.put("/nobroker-sync", verifyToken, checkAdminEmail, validate(Joi.object({ enabled: Joi.boolean().required() }), "body"), async (req, res, next) => {
  try {
    const AppSetting = require("../models/AppSetting.model");
    const { SETTING_KEY } = nbSync();
    await AppSetting.updateOne({ key: SETTING_KEY }, { $set: { "value.enabled": req.body.enabled } }, { upsert: true });
    res.json({ success: true, data: { enabled: req.body.enabled } });
  } catch (e) { next(e); }
});

router.post("/nobroker-sync/run", verifyToken, checkAdminEmail, scraperLimiter, (req, res) => {
  if (nbSyncRunning) return res.status(409).json({ success: false, message: "Sync already running" });
  nbSyncRunning = true;
  nbSync().runAndRecord("manual").catch((e) => console.error("[nobrokerSync] manual run failed:", e)).finally(() => { nbSyncRunning = false; });
  res.json({ success: true, message: "Sync started" });
});

/**
 * Error handling middleware for this router
 */
router.use((err, req, res, next) => {
  // Pass to global error handler
  next(err);
});

module.exports = router;
