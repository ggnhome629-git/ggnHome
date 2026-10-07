/**
 * Property Sync Controller
 * Handles HTTP requests for property verification/sync operations
 */

const propertySyncService = require("../services/propertySync.service");
const { sendSuccess, sendError } = require("../utils/response");
const { logger } = require("../config/logger");

/**
 * POST /api/admin/property-sync/start
 * Start property verification job
 */
const startVerification = async (req, res) => {
  try {
    const { source = "nobroker" } = req.body;

    logger.audit("Property verification started", { source }, {
      requestId: req.id,
      userId: req.user?.id,
    });

    const result = await propertySyncService.startVerificationJob(source);

    sendSuccess(
      res,
      propertySyncService.getStatus(),
      "Property verification job started",
      202
    );
  } catch (error) {
    logger.error("Failed to start property verification", {
      requestId: req.id,
      userId: req.user?.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/property-sync/status
 * Get current verification status with detailed information
 */
const getStatus = async (req, res) => {
  try {
    const status = propertySyncService.getStatus();
    const report = propertySyncService.getDetailedReport();

    sendSuccess(res, {
      status,
      report,
    });
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/property-sync/report
 * Get detailed verification report with all metrics
 */
const getDetailedReport = async (req, res) => {
  try {
    const report = propertySyncService.getDetailedReport();
    sendSuccess(res, report, "Detailed verification report");
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * POST /api/admin/property-sync/stop
 * Stop running verification job
 */
const stopVerification = async (req, res) => {
  try {
    logger.audit("Property verification stopped", {}, {
      requestId: req.id,
      userId: req.user?.id,
    });

    const result = propertySyncService.stopJob();
    sendSuccess(res, result, "Verification stopped");
  } catch (error) {
    logger.error("Failed to stop property verification", {
      requestId: req.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/property-sync/logs
 * Get verification logs
 */
const getLogs = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = propertySyncService.getLogs(Math.min(parseInt(limit), 500));
    sendSuccess(res, logs, "Verification logs retrieved");
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * PATCH /api/admin/property-sync/schedule
 * Update verification schedule
 */
const updateSchedule = async (req, res) => {
  try {
    const { frequency } = req.body; // 'daily', 'weekly', 'monthly'

    if (!frequency) {
      return sendError(res, { message: "Frequency required" }, 400);
    }

    logger.audit("Property verification schedule updated", { frequency }, {
      requestId: req.id,
      userId: req.user?.id,
    });

    // Logic to update schedule would go here
    // This would typically update a database record

    sendSuccess(res, {
      frequency,
      message: "Schedule updated",
    });
  } catch (error) {
    logger.error("Failed to update verification schedule", {
      requestId: req.id,
      error: error.message,
    });

    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/admin/property-sync/statistics
 * Get verification statistics and metrics
 */
const getStatistics = async (req, res) => {
  try {
    const status = propertySyncService.getStatus();
    const report = propertySyncService.getDetailedReport();

    const statistics = {
      overview: {
        totalRuns: status.stats.totalRun,
        successfulRuns: status.stats.successfulRuns,
        failedRuns: status.stats.failedRuns,
        successRate: status.stats.totalRun > 0
          ? Math.round((status.stats.successfulRuns / status.stats.totalRun) * 100)
          : 0,
      },
      properties: {
        totalVerified: status.stats.propertiesVerified,
        live: report.liveStatus.live,
        delisted: report.liveStatus.delisted,
        delistRate: report.summary.totalPropertiesInDB > 0
          ? Math.round(
              (report.liveStatus.delisted / report.summary.totalPropertiesInDB) * 100
            )
          : 0,
      },
      changes: {
        priceChanges: status.stats.priceChanges,
        imageChanges: status.stats.imageChanges,
        totalChanges: status.stats.priceChanges + status.stats.imageChanges,
      },
      scheduling: {
        lastRun: status.stats.lastRun,
        nextRun: status.stats.nextRun,
        lastRunDaysAgo: status.stats.lastRun
          ? Math.floor((new Date() - new Date(status.stats.lastRun)) / (1000 * 60 * 60 * 24))
          : null,
      },
      currentJob: status.currentJob ? {
        status: status.currentJob.status,
        progress: status.currentJob.progress,
        currentlyChecking: status.currentJob.progress.currentProperty,
      } : null,
    };

    sendSuccess(res, statistics, "Verification statistics");
  } catch (error) {
    sendError(res, error, error.statusCode || 500);
  }
};

/**
 * GET /api/cron/property-sync-trigger
 * Cron endpoint for external automated verification
 */
const cronTrigger = async (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    propertySyncService.startVerificationJob('nobroker')
      .then(() => {
        logger.info('Property verification started via cron', {
          cron: true,
        });
      })
      .catch((error) => {
        logger.error('Cron property verification failed', {
          error: error.message,
        });
      });

    res.status(202).json({
      status: 'Property verification job queued',
      message: 'Verification will run in background',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to queue verification job',
      message: error.message,
    });
  }
};

module.exports = {
  startVerification,
  getStatus,
  getDetailedReport,
  stopVerification,
  getLogs,
  updateSchedule,
  getStatistics,
  cronTrigger,
};
