require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./config/db");
const { closeDB, dbStatus } = db;
const { enforceEnv } = require("./config/validateEnv");
const { capPagination } = require("./middleware/capPagination");
const mongoose = require("mongoose");
const helmet = require("helmet");
const routes = require("./Route/route");
const { requestId, notFound, errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimit");
const { startNoBrokerSyncCron, startReminderCron } = require("./cron/nobrokerSyncCron");
const { startRankingScheduler } = require("./jobs/rankingScheduler");
const { startPopularPushScheduler, runPopularPush, runPersonalPush } = require("./jobs/popularPush");
const { startSmartNotificationScheduler, runSmartNotifications } = require("./services/smartNotifications");
const redisCache = require("./utils/redisCache");
const { configureMongoose, enableQueryProfiling } = require("./config/dbOptimization");
const DEFAULT_ORIGINS = ["https://www.ggnhome.com", "https://ggnhome.com"];
const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
// Without ALLOWED_ORIGINS the site and the apps (which load www.ggnhome.com) must still work.
const allowedOrigins = configuredOrigins.length ? configuredOrigins : DEFAULT_ORIGINS;
const isLocalDevOrigin = (origin) =>
  process.env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

// Initialize Express
const app = express();
let shuttingDown = false;
// Health check for uptime monitors (added by Stashr)
// Liveness: the process is up. Never touches the database, so a database outage does not make the host kill the server.
app.get("/health", (req, res) => res.status(200).json({ status: "ok", uptime: process.uptime() }));
// Readiness: can this server take traffic? Use this as the host's health check path and in a load balancer.
// 503 until MongoDB answers, and while the server is shutting down (so it is taken out of rotation first).
app.get("/health/ready", async (req, res) => {
  const checks = { database: dbStatus(), redis: "off", cloudinaryAccounts: 0, shuttingDown: shuttingDown };
  try { checks.redis = redisCache.isConnected() ? "connected" : (process.env.REDIS_URL || process.env.REDIS_URI ? "down" : "off"); } catch (_) { checks.redis = "unknown"; }
  try { checks.cloudinaryAccounts = require("./config/FileHandling").accountCount(); } catch (_) { /* uploads not configured */ }
  let ready = checks.database.connected && !shuttingDown;
  if (ready) {
    try {
      await Promise.race([
        mongoose.connection.db.command({ ping: 1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("ping timeout")), 3000)),
      ]);
    } catch (_) {
      ready = false;
    }
  }
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not ready", ...checks });
});
app.set("trust proxy", 1); // Render sits behind a proxy; needed for real client IPs

// Middleware
app.use(requestId);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser()); // must be before routes

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Lets the search page read the total result count for "page X of Y".
  exposedHeaders: ['X-Total-Count'],
};

app.use(cors(corsOptions));

// Log origin middleware for debugging
app.use((req, res, next) => {
  
  next();
});

// Health check (for uptime monitors / Render)
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "ggnHome API",
    uptime: Math.round(process.uptime()),
    // Set automatically by Render: shows which commit is actually deployed.
    commit: (process.env.RENDER_GIT_COMMIT || "unknown").slice(0, 7),
  });
});

// Keep-alive endpoint (prevent auto-sleep on free tier)
app.get("/api/keep-alive", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Cron trigger endpoint (for external cron services)
app.post("/api/cron/scraper-trigger", (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];

  // If CRON_SECRET isn't configured, refuse rather than silently letting
  // `undefined !== undefined` (i.e. no secret supplied) pass the check.
  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Import here to avoid circular dependency
  const scraperService = require('./services/scraper.service');

  scraperService.startScrapingJob('nobroker')
    .then((result) => {
      res.status(202).json({
        status: 'Scraper job started',
        jobId: result.jobId
      });
    })
    .catch((error) => {
      res.status(500).json({
        error: 'Failed to start scraper',
        message: error.message
      });
    });
});

// Popular-property + personal push trigger (external cron, e.g. cron-job.org)
app.get("/api/cron/popular-push", async (req, res) => {
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    res.json({ popular: await runPopularPush(), personal: await runPersonalPush() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smart push trigger: property-matched notifications or useful general updates.
app.get("/api/cron/smart-push", async (req, res) => {
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    res.json(await runSmartNotifications({ max: Number(req.query.max) || 300 }));
  } catch (err) {
    res.status(500).json({ error: "Smart notification campaign failed" });
  }
});

// Property sync cron trigger endpoint
app.get("/api/cron/property-sync-trigger", (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];

  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Import here to avoid circular dependency
  const propertySyncService = require('./services/propertySync.service');

  propertySyncService.startVerificationJob('nobroker')
    .then(() => {
      res.status(202).json({
        status: 'Property verification job started'
      });
    })
    .catch((error) => {
      res.status(500).json({
        error: 'Failed to start verification',
        message: error.message
      });
    });
});

// Routes
// One page can never be bigger than MAX_PAGE_SIZE (default 200).
app.use(capPagination);
app.use(apiLimiter);
app.use("/", routes);
app.use(notFound);
app.use(errorHandler);

// Only connect, schedule jobs and listen when run directly (node index.js).
// Tests import `app` and bring their own database.
if (require.main === module) {
  enforceEnv();
  db();

  // Every new deploy clears the browser, Redis and Cloudflare caches once (see cachePurge.controller).
  if (process.env.NODE_ENV !== "test") {
    require("./controllers/cachePurge.controller").autoPurgeOnDeploy().catch((err) => console.warn("Deploy cache clear failed:", err.message));
  }

  // Initialize Redis cache (optional - gracefully degrades if unavailable)
  redisCache.initialize().catch(err => {
    console.warn('⚠️ Warning: Redis cache initialization failed:', err.message);
  });

  // NoBroker sync no longer auto-runs. Start it manually (npm run sync:nobroker,
  // or the /api/cron/* trigger endpoints), or turn on the daily 3:30 AM IST run from
  // Admin > Scraper Control.
  // Always scheduled; the job itself checks the admin-panel toggle (Scraper Control) before running.
  if (process.env.DISABLE_CRON !== "true") startNoBrokerSyncCron();
  if (process.env.NODE_ENV !== "test" && process.env.DISABLE_CRON !== "true") startReminderCron();
  if (process.env.DISABLE_CRON !== "true") {
    try {
      startPopularPushScheduler();
      startSmartNotificationScheduler();
    } catch (error) {
      console.error('⚠️ Warning: Failed to start push scheduler:', error.message);
    }
    try {
      startRankingScheduler();
    } catch (error) {
      console.error('⚠️ Warning: Failed to initialize ranking scheduler:', error.message);
      // Continue startup even if scheduler fails
    }
  }
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`API listening on ${PORT}`);
  });
  require('./services/dbPool').start();

  // The host's load balancer keeps connections open ~60 s: stay open a little longer than that, or it will
  // reuse a connection this server just closed and show the visitor a 502.
  server.keepAliveTimeout = 65 * 1000;
  server.headersTimeout = 66 * 1000;
  server.requestTimeout = 120 * 1000;

  // ---- Shutting down: finish the requests in progress, then close the database and Redis ----
  // The host sends SIGTERM on every deploy. Without this, requests in flight (an upload, a save) are cut off.
  const shutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Finishing requests and shutting down.`);
    const force = setTimeout(() => {
      console.error("Shutdown took too long. Exiting now.");
      process.exit(exitCode || 1);
    }, 25 * 1000);
    if (force.unref) force.unref();
    server.close(async () => {
      try { await redisCache.disconnect(); } catch (_) { /* not connected */ }
      await closeDB();
      clearTimeout(force);
      process.exit(exitCode);
    });
    if (server.closeIdleConnections) server.closeIdleConnections();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // A promise nobody waited for must not take the whole API down: log it and carry on.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason && reason.stack ? reason.stack : reason);
  });
  // After an uncaught exception the process state is unknown: finish what is running, then restart clean.
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err && err.stack ? err.stack : err);
    shutdown("uncaughtException", 1);
  });
}

module.exports = app;
