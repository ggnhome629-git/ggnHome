const crypto = require("crypto");

const requestId = (req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.set("X-Request-Id", req.id);
  next();
};

const notFound = (req, res) =>
  res.status(404).json({ code: "NOT_FOUND", message: "Route not found." });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ code: "CORS", message: "Origin not allowed." });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ code: "BAD_JSON", message: "Invalid JSON body." });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ code: "TOO_LARGE", message: "Request body too large." });
  }
  if (err && err.name === "MulterError") {
    return res.status(400).json({ code: "UPLOAD", message: err.message });
  }
  const status = err.status || err.statusCode || 500;
  console.error(`[${req.id}] ${req.method} ${req.originalUrl}`, status >= 500 ? err : err.message);
  res.status(status).json({
    code: status >= 500 ? "SERVER_ERROR" : "ERROR",
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Something went wrong." : err.message,
    requestId: req.id,
  });
};

module.exports = { requestId, notFound, errorHandler };
