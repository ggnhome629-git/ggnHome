/**
 * Winston Logger Configuration
 * Structured logging with multiple transports
 */

const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, requestId, userId, ...rest }) => {
    const prefix = `[${timestamp}] ${level}`;
    const contextInfo = requestId ? ` [${requestId}]` : "";
    const userInfo = userId ? ` [user:${userId}]` : "";
    const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
    return `${prefix}${contextInfo}${userInfo} ${message}${extra}`;
  })
);

// Logger transports
const transports = [
  // Console output (all levels)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || "info",
  }),

  // Error log (errors only)
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Application log (info and above)
  new winston.transports.File({
    filename: path.join(logsDir, "application.log"),
    level: "info",
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 10,
  }),

  // Debug log (everything)
  new winston.transports.File({
    filename: path.join(logsDir, "debug.log"),
    level: "debug",
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined log
  new winston.transports.File({
    filename: path.join(logsDir, "combined.log"),
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 20,
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  defaultMeta: { service: "ggnhome-api" },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: customFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: customFormat,
    }),
  ],
});

/**
 * Helper methods for common logging patterns
 */

logger.http = (method, url, status, duration, { requestId, userId } = {}) => {
  logger.info(`${method} ${url} ${status}`, {
    requestId,
    userId,
    method,
    url,
    status,
    duration: `${duration}ms`,
  });
};

logger.database = (operation, table, duration, { requestId, success } = {}) => {
  const level = success ? "debug" : "warn";
  logger[level](`Database ${operation} on ${table}`, {
    requestId,
    operation,
    table,
    duration: `${duration}ms`,
  });
};

logger.audit = (action, details = {}, { requestId, userId } = {}) => {
  logger.info(`AUDIT: ${action}`, {
    requestId,
    userId,
    action,
    ...details,
  });
};

logger.scraper = (status, message, details = {}) => {
  logger[status === "success" ? "info" : "error"](`Scraper: ${message}`, {
    service: "scraper",
    ...details,
  });
};

logger.cache = (operation, key, hit = false, duration = null) => {
  logger.debug(`Cache ${operation}: ${key}`, {
    service: "cache",
    operation,
    key,
    hit,
    duration: duration ? `${duration}ms` : null,
  });
};

/**
 * Express middleware for automatic HTTP logging
 */
const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const duration = Date.now() - startTime;
    logger.http(req.method, req.originalUrl, res.statusCode, duration, {
      requestId: req.id,
      userId: req.user?.id,
    });
    return originalJson(data);
  };

  // Override res.send for non-JSON responses
  const originalSend = res.send.bind(res);
  res.send = function (data) {
    const duration = Date.now() - startTime;
    logger.http(req.method, req.originalUrl, res.statusCode, duration, {
      requestId: req.id,
      userId: req.user?.id,
    });
    return originalSend(data);
  };

  next();
};

module.exports = {
  logger,
  httpLogger,
};
