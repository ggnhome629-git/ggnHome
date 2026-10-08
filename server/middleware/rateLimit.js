const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const redisCache = require("../utils/redisCache");
const RateLimitHit = require("../models/RateLimitHit.model");

// Render runs multiple instances of this service, each with its own process
// memory. express-rate-limit's default store counts hits in that memory, so
// "15 per 15 min" really means ~15 per instance -- an attacker's requests
// land on whichever instance the load balancer picks, and each instance's
// counter resets independently. Confirmed live: RateLimit-Remaining jumped
// backwards across sequential requests in production.
//
// This store shares hit counts across every instance instead, in order of
// preference:
//   1. Redis, if configured and connected (atomic INCR) -- not provisioned
//      today, but used automatically the moment REDIS_URL is set, no code
//      change needed.
//   2. MongoDB, already connected from every instance -- an atomic
//      findOneAndUpdate($inc) against models/RateLimitHit.model.js, which
//      self-expires via a TTL index.
//   3. A local in-memory Map, only if both of the above are unreachable --
//      today's pre-fix behavior, never worse than before this change.
class SharedStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localHits = new Map(); // key -> { count, resetAt } used only as last-resort fallback
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const redisKey = `ratelimit:${this.prefix}:${key}`;
    const redisClient = redisCache.isConnected() ? redisCache.getClient() : null;

    if (redisClient) {
      try {
        const count = await redisClient.incr(redisKey);
        if (count === 1) {
          await redisClient.pexpire(redisKey, this.windowMs);
        }
        const pttl = await redisClient.pttl(redisKey);
        return {
          totalHits: count,
          resetTime: new Date(Date.now() + (pttl > 0 ? pttl : this.windowMs)),
        };
      } catch (_) {
        // Redis hiccup mid-request: fall through to Mongo/memory below
        // rather than letting the request through unlimited.
      }
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const now = Date.now();
        const doc = await RateLimitHit.findOneAndUpdate(
          { key: redisKey },
          {
            $inc: { count: 1 },
            $setOnInsert: { resetAt: new Date(now + this.windowMs) },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return { totalHits: doc.count, resetTime: doc.resetAt };
      } catch (_) {
        // Mongo hiccup / race on the upsert: fall through to local memory.
      }
    }

    const now = Date.now();
    const entry = this.localHits.get(key);
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.localHits.set(key, { count: 1, resetAt });
      return { totalHits: 1, resetTime: new Date(resetAt) };
    }
    entry.count += 1;
    return { totalHits: entry.count, resetTime: new Date(entry.resetAt) };
  }

  async decrement(key) {
    const redisKey = `ratelimit:${this.prefix}:${key}`;
    const redisClient = redisCache.isConnected() ? redisCache.getClient() : null;
    if (redisClient) {
      try {
        const n = await redisClient.decr(redisKey);
        if (n <= 0) await redisClient.del(redisKey);
        return;
      } catch (_) {}
    }
    if (mongoose.connection.readyState === 1) {
      try {
        await RateLimitHit.updateOne({ key: redisKey, count: { $gt: 0 } }, { $inc: { count: -1 } });
        return;
      } catch (_) {}
    }
    const entry = this.localHits.get(key);
    if (entry) entry.count = Math.max(0, entry.count - 1);
  }

  async resetKey(key) {
    const redisKey = `ratelimit:${this.prefix}:${key}`;
    const redisClient = redisCache.isConnected() ? redisCache.getClient() : null;
    if (redisClient) {
      try {
        await redisClient.del(redisKey);
      } catch (_) {}
    }
    if (mongoose.connection.readyState === 1) {
      try {
        await RateLimitHit.deleteOne({ key: redisKey });
      } catch (_) {}
    }
    this.localHits.delete(key);
  }
}

// Counts per IP. Behind Render's proxy `trust proxy` must be set (index.js)
// or every user shares one bucket.
const make = ({ name, windowMs, max, message, keyGenerator }) => {
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
    store: new SharedStore(name),
    handler: (req, res, _next, options) => {
      const retryAfterSec = Math.ceil(options.windowMs / 1000);
      res.set("Retry-After", String(retryAfterSec));
      res.status(429).json({
        code: "RATE_LIMITED",
        message: message || "Too many attempts. Please try again later.",
        retryAfterSec,
      });
    },
  };

  // Only add keyGenerator if provided and not relying on IP
  if (keyGenerator) {
    config.keyGenerator = keyGenerator;
  }

  return rateLimit(config);
};

// Custom key generator that uses mobile first, only IP if mobile not available
const byMobileOrIp = (req) => {
  const mobile = req.body?.mobileNumber || req.body?.mobile;
  if (mobile) return String(mobile);
  // If no mobile, fall back to default IP-based bucketing (don't return req.ip directly)
  return "default-bucket";
};

// OTP sending costs money (SMS) - keep it tight, per IP.
const otpRequestLimiter = make({
  name: "otp-req",
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many OTP requests. Try again in 10 minutes.",
});
const otpRequestIpLimiter = make({ name: "otp-req-ip", windowMs: 60 * 60 * 1000, max: 30 });
const otpVerifyLimiter = make({
  name: "otp-verify",
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Try again in 10 minutes.",
});
const loginLimiter = make({
  name: "login",
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many login attempts. Try again in 15 minutes.",
});
// Anonymous forms that create DB rows.
const guestFormLimiter = make({
  name: "guest-form",
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many submissions. Please try again later.",
});
const chatLimiter = make({ name: "chat", windowMs: 10 * 60 * 1000, max: 60 });
const apiLimiter = make({ name: "api", windowMs: 60 * 1000, max: 600 });

module.exports = {
  otpRequestLimiter,
  otpRequestIpLimiter,
  otpVerifyLimiter,
  loginLimiter,
  guestFormLimiter,
  chatLimiter,
  apiLimiter,
};
