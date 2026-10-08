/**
 * Backing store for the shared rate limiter (middleware/rateLimit.js).
 *
 * Render runs this service as multiple instances, each with its own process
 * memory, so express-rate-limit's default in-memory counter only limits
 * requests that happen to land on the same instance. MongoDB is already
 * connected from every instance and is the one piece of shared state this
 * app has without adding new infrastructure, so hit counts live here
 * instead. The TTL index expires a window's document on its own once
 * resetAt passes -- the next hit for that key then starts a fresh window
 * via upsert, so there is no cleanup job to run.
 */
const mongoose = require("mongoose");

const rateLimitHitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  // TTL index: Mongo's background sweep deletes the doc after this time,
  // which can lag the exact instant by up to ~60s -- the window then runs
  // slightly longer than configured in the worst case, never shorter, so
  // this stays a conservative (not weaker) bound for a security control.
  resetAt: { type: Date, required: true, expires: 0 },
});

module.exports =
  mongoose.models.RateLimitHit || mongoose.model("RateLimitHit", rateLimitHitSchema);
