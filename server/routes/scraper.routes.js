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
 * Error handling middleware for this router
 */
router.use((err, req, res, next) => {
  // Pass to global error handler
  next(err);
});

module.exports = router;
