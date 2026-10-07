const rateLimit = require("express-rate-limit");

// Counts per IP. Behind Render's proxy `trust proxy` must be set (index.js)
// or every user shares one bucket.
const make = ({ windowMs, max, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
    handler: (req, res, _next, options) => {
      const retryAfterSec = Math.ceil(options.windowMs / 1000);
      res.set("Retry-After", String(retryAfterSec));
      res.status(429).json({
        code: "RATE_LIMITED",
        message: message || "Too many attempts. Please try again later.",
        retryAfterSec,
      });
    },
  });

const byMobileOrIp = (req) =>
  String(req.body?.mobileNumber || req.body?.mobile || req.ip || "anon");

// OTP sending costs money (SMS) - keep it tight, per mobile and per IP.
const otpRequestLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many OTP requests. Try again in 10 minutes.",
  keyGenerator: byMobileOrIp,
});
const otpRequestIpLimiter = make({ windowMs: 60 * 60 * 1000, max: 30 });
const otpVerifyLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Try again in 10 minutes.",
  keyGenerator: byMobileOrIp,
});
const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many login attempts. Try again in 15 minutes.",
  keyGenerator: byMobileOrIp,
});
// Anonymous forms that create DB rows.
const guestFormLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many submissions. Please try again later.",
});
const chatLimiter = make({ windowMs: 10 * 60 * 1000, max: 60 });
const apiLimiter = make({ windowMs: 60 * 1000, max: 600 });

module.exports = {
  otpRequestLimiter,
  otpRequestIpLimiter,
  otpVerifyLimiter,
  loginLimiter,
  guestFormLimiter,
  chatLimiter,
  apiLimiter,
};
