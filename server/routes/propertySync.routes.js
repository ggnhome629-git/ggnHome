/**
 * Property Sync Routes
 * Admin-only endpoints for managing property verification/sync operations
 */

const express = require("express");
const router = express.Router();
const Joi = require("joi");

const propertySyncController = require("../controllers/propertySync.controller");
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

// Rate limiter for property sync (more lenient than general API)
const syncLimiter = require("express-rate-limit")({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (allows monitoring)
  message: "Too many property sync requests",
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Validation schemas
 */
const startVerificationSchema = Joi.object({
  source: Joi.string().valid("nobroker", "99acres", "all").default("nobroker"),
});

const scheduleSchema = Joi.object({
  frequency: Joi.string().valid("daily", "weekly", "biweekly", "monthly").required(),
});

/**
 * Routes - All require admin authentication
 */

/**
 * POST /api/admin/property-sync/start
 * Start property verification job
 * Admin only
 */
router.post(
  "/start",
  verifyToken, checkAdminEmail,
  syncLimiter,
  validate(startVerificationSchema, "body"),
  propertySyncController.startVerification
);

/**
 * GET /api/admin/property-sync/status
 * Get current verification status with detailed info
 * Admin only
 */
router.get(
  "/status",
  verifyToken, checkAdminEmail,
  propertySyncController.getStatus
);

/**
 * GET /api/admin/property-sync/report
 * Get detailed verification report
 * Admin only
 */
router.get(
  "/report",
  verifyToken, checkAdminEmail,
  propertySyncController.getDetailedReport
);

/**
 * POST /api/admin/property-sync/stop
 * Stop running verification job
 * Admin only
 */
router.post(
  "/stop",
  verifyToken, checkAdminEmail,
  syncLimiter,
  propertySyncController.stopVerification
);

/**
 * GET /api/admin/property-sync/logs
 * Get verification logs
 * Admin only, query limit (max 500)
 */
router.get(
  "/logs",
  verifyToken, checkAdminEmail,
  propertySyncController.getLogs
);

/**
 * GET /api/admin/property-sync/statistics
 * Get verification statistics and metrics
 * Admin only
 */
router.get(
  "/statistics",
  verifyToken, checkAdminEmail,
  propertySyncController.getStatistics
);

/**
 * PATCH /api/admin/property-sync/schedule
 * Update verification schedule
 * Admin only
 */
router.patch(
  "/schedule",
  verifyToken, checkAdminEmail,
  validate(scheduleSchema, "body"),
  propertySyncController.updateSchedule
);

/**
 * GET /api/cron/property-sync-trigger
 * External cron trigger for automated verification
 * Public endpoint but requires CRON_SECRET
 */
router.get(
  "/cron-trigger",
  propertySyncController.cronTrigger
);

/**
 * Error handling middleware for this router
 */
router.use((err, req, res, next) => {
  // Pass to global error handler
  next(err);
});

module.exports = router;
