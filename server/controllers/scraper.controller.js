/**
 * Scraper Controller
 * Handles HTTP requests for scraper operations
 * Thin layer - delegates to service
 */

const scraperService = require("../services/scraper.service");
const { sendSuccess, sendError } = require("../utils/response");
const { logger } = require("../config/logger");

/**
 * POST /api/admin/scraper/run
 * Start a scraping job
 */
const startScraper = async (req, res) => {
  try {
    const { source = "all" } = req.body;

    logger.audit("Scraper started", { source }, {
      requestId: req.id,
      userId: req.user?.id,
    });

    const result = await scraperService.startScrapingJob(source);

    sendSuccess(res, result, "Scraper job started", 202);
  } catch (error) {
    logger.error("Failed to start scraper", {
      requestId: req.id,
      userId: req.user?.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/scraper/status
 * Get current scraper status
 */
const getStatus = async (req, res) => {
  try {
    const status = scraperService.getStatus();
    sendSuccess(res, status, "Scraper status retrieved");
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * POST /api/admin/scraper/stop
 * Stop current scraping job
 */
const stopScraper = async (req, res) => {
  try {
    logger.audit("Scraper stopped", {}, {
      requestId: req.id,
      userId: req.user?.id,
    });

    const result = scraperService.stopJob();
    sendSuccess(res, result, "Scraper stopped");
  } catch (error) {
    logger.error("Failed to stop scraper", {
      requestId: req.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/scraper/logs
 * Get scraper logs
 */
const getLogs = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await scraperService.getLogs(Math.min(parseInt(limit), 1000));
    sendSuccess(res, logs, "Logs retrieved");
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * PATCH /api/admin/scraper/schedule
 * Update scraper schedule
 */
const updateSchedule = async (req, res) => {
  try {
    const { cron } = req.body;

    if (!cron) {
      return sendError(res, { message: "Cron expression required" }, 400);
    }

    logger.audit("Scraper schedule update requested", { cron }, {
      requestId: req.id,
      userId: req.user?.id,
    });

    const result = await scraperService.updateSchedule(cron);
    sendSuccess(res, result, "Schedule updated");
  } catch (error) {
    logger.error("Failed to update schedule", {
      requestId: req.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

module.exports = {
  startScraper,
  getStatus,
  stopScraper,
  getLogs,
  updateSchedule,
};
