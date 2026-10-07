require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./config/db");
const helmet = require("helmet");
const routes = require("./Route/route");
const { requestId, notFound, errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimit");
const { startNoBrokerSyncCron, startReminderCron } = require("./cron/nobrokerSyncCron");
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const isLocalDevOrigin = (origin) =>
  process.env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

// Initialize Express
const app = express();
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

// Routes
app.use(apiLimiter);
app.use("/", routes);
app.use(notFound);
app.use(errorHandler);

// Only connect, schedule jobs and listen when run directly (node index.js).
// Tests import `app` and bring their own database.
if (require.main === module) {
  db();
  // Daily background sync: mirrors each scraped listing's live NoBroker status
  if (process.env.DISABLE_CRON !== "true") startNoBrokerSyncCron();
  if (process.env.NODE_ENV !== "test" && process.env.DISABLE_CRON !== "true") startReminderCron();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`API listening on ${PORT}`);
  });
}

module.exports = app;
