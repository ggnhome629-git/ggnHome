const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
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
  constructor(prefix, windowJitterMs) {
    this.prefix = prefix;
    this.windowJitterMs = windowJitterMs; // optional [minMs, maxMs]: each window lasts a random time in this range
    this.localHits = new Map(); // key -> { count, resetAt } used only as last-resort fallback
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  // Length of a NEW window: fixed, or random inside windowJitterMs so blocked
  // clients wait slightly different times and their retries don't arrive in sync.
  nextWindowMs() {
    if (!this.windowJitterMs) return this.windowMs;
    const [min, max] = this.windowJitterMs;
    return Math.round(min + Math.random() * (max - min));
  }

  async increment(key) {
    const redisKey = `ratelimit:${this.prefix}:${key}`;
    const redisClient = redisCache.isConnected() ? redisCache.getClient() : null;

    if (redisClient) {
      try {
        const count = await redisClient.incr(redisKey);
        if (count === 1) {
          await redisClient.pexpire(redisKey, this.nextWindowMs());
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
        const nowDate = new Date(now);
        const freshResetAt = new Date(now + this.nextWindowMs());
        // One atomic pipeline update. A window whose resetAt has passed starts
        // over at count 1 even if Mongo's TTL sweep (which can lag ~60s) has not
        // deleted the doc yet -- needed now that windows can be only 30-60s long.
        const expired = { $lte: [{ $ifNull: ["$resetAt", nowDate] }, nowDate] };
        const doc = await RateLimitHit.findOneAndUpdate(
          { key: redisKey },
          [
            {
              $set: {
                count: { $cond: [expired, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
                resetAt: { $cond: [expired, freshResetAt, "$resetAt"] },
              },
            },
          ],
          { upsert: true, new: true }
        );
        return { totalHits: doc.count, resetTime: doc.resetAt };
      } catch (_) {
        // Mongo hiccup / race on the upsert: fall through to local memory.
      }
    }

    const now = Date.now();
    const entry = this.localHits.get(key);
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.nextWindowMs();
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

// Default key: the client's real IP. Traffic reaches this app through two
// proxies (Cloudflare, then Render's own router), and depending on exactly
// how many hops `trust proxy` ends up trusting, req.ip can resolve to one
// of Cloudflare's many edge IPs instead of the real client -- confirmed
// live: RateLimit-Remaining on repeated requests from one unchanging
// connection came back non-monotonic (14,14,14,13,13,12,...,13,11,10,12),
// consistent with each request being keyed under a slightly different
// apparent IP. Cloudflare's CF-Connecting-IP header is set at their edge
// from the actual client connection and can't be spoofed by the client (any
// value sent by the client is overwritten), so it's used first when
// present; req.ip (via express-rate-limit's IPv6-safe helper) is the
// fallback for traffic that doesn't come through Cloudflare, e.g. direct
// requests in a non-production environment.
const cfSafeKeyGenerator = (req) => {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) return ipKeyGenerator(String(cfIp));
  return ipKeyGenerator(req.ip);
};

// Counts per IP. Behind Render's proxy `trust proxy` must be set (index.js)
// or every user shares one bucket.
// `windowJitterMs: [min, max]` makes every window last a random time in that
// range instead of a fixed `windowMs`. `message` may be a function of the
// seconds left, so the text can say exactly how long to wait.
const make = ({ name, windowMs, max, message, keyGenerator, windowJitterMs }) => {
  const config = {
    windowMs: windowJitterMs ? windowJitterMs[1] : windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.DISABLE_RATE_LIMIT === "true",
    store: new SharedStore(name, windowJitterMs),
    keyGenerator: keyGenerator || cfSafeKeyGenerator,
    handler: (req, res, _next, options) => {
      // Seconds until THIS window actually ends (not the configured maximum).
      const resetTime = req.rateLimit && req.rateLimit.resetTime;
      const retryAfterSec = resetTime
        ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
        : Math.ceil(options.windowMs / 1000);
      res.set("Retry-After", String(retryAfterSec));
      res.status(429).json({
        code: "RATE_LIMITED",
        message: typeof message === "function" ? message(retryAfterSec) : message || "Too many attempts. Please try again later.",
        retryAfterSec,
      });
    },
  };

  return rateLimit(config);
};

// Custom key generator that uses mobile first, only IP if mobile not available
const byMobileOrIp = (req) => {
  const mobile = req.body?.mobileNumber || req.body?.mobile;
  if (mobile) return String(mobile);
  // If no mobile, fall back to default IP-based bucketing (don't return req.ip directly)
  return "default-bucket";
};

// OTP sending costs money (SMS) - keep it tight, per IP. A blocked client waits
// a random 30-60 seconds (not minutes); the hourly cap below is the abuse backstop.
const otpRequestLimiter = make({
  name: "otp-req",
  windowJitterMs: [30 * 1000, 60 * 1000],
  max: 5,
  message: (sec) => `Too many OTP requests. Please try again in ${sec} seconds.`,
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
// The hidden SMS console's owner login: a guessed password must be hopeless.
const smsConsoleLoginLimiter = make({
  name: "sms-console-login",
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Too many attempts. Try again in 15 minutes.",
});
const chatLimiter = make({ name: "chat", windowMs: 10 * 60 * 1000, max: 60 });
const apiLimiter = make({ name: "api", windowMs: 60 * 1000, max: 600 });
// AI Property Consultant: a conversation is ~15-30 turns and a few searches.
const aiTurnLimiter = make({ name: "ai-turn", windowMs: 10 * 60 * 1000, max: 120, message: "You're going a little fast — please wait a moment and try again." });
// Riya's voice: a reply is spoken in 1-3 sentence clips, plus one clip per thing the visitor says.
const aiSpeechLimiter = make({ name: "ai-speech", windowMs: 10 * 60 * 1000, max: 500, message: "Voice is busy — please wait a moment." });
const aiSearchLimiter = make({ name: "ai-search", windowMs: 10 * 60 * 1000, max: 40, message: "Too many searches — please wait a moment and try again." });

// Partner address box: a few suggestion calls per typed address, so allow plenty
// per 10 minutes (the client also waits for the partner to pause typing).
const locationLookupLimiter = make({ name: "partner-location", windowMs: 10 * 60 * 1000, max: 150, message: "Too many location searches — please wait a moment and try again." });

// After a successful OTP verification the client is clearly a real user: reset
// their OTP request and verify counters to zero so they are never left locked out.
const resetOtpLimits = async (req) => {
  const key = cfSafeKeyGenerator(req);
  await Promise.all([otpRequestLimiter, otpRequestIpLimiter, otpVerifyLimiter].map((limiter) => limiter.resetKey(key)));
};

module.exports = {
  aiSpeechLimiter,
  resetOtpLimits,
  locationLookupLimiter,
  otpRequestLimiter,
  otpRequestIpLimiter,
  otpVerifyLimiter,
  loginLimiter,
  guestFormLimiter,
  chatLimiter,
  smsConsoleLoginLimiter,
  apiLimiter,
  aiTurnLimiter,
  aiSearchLimiter,
};
