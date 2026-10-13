/**
 * Shared, fail-closed provider quota reservations.
 * Uses MongoDB as the shared store so counters survive restarts and multiple
 * API instances. Each reservation is conservative: failed/ambiguous provider
 * attempts remain counted until the bucket expires, avoiding quota overshoot.
 */
const mongoose = require("mongoose");
const ProviderUsageCounter = require("../models/ProviderUsageCounter.model");

async function reserveWindow({ provider, windowMs, limit, amount = 1 }) {
  if (!provider || !Number.isFinite(windowMs) || windowMs <= 0 ||
      !Number.isInteger(limit) || limit <= 0 ||
      !Number.isInteger(amount) || amount <= 0 || amount > limit) {
    return { allowed: false, reason: "invalid_quota_config" };
  }
  if (mongoose.connection.readyState !== 1) {
    return { allowed: false, reason: "quota_store_unavailable" };
  }

  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const key = `provider-quota:${provider}:${bucket}`;
  const resetAt = new Date((bucket + 1) * windowMs + windowMs * 2);

  try {
    try {
      await ProviderUsageCounter.findOneAndUpdate(
        { key },
        { $setOnInsert: { key, count: 0, resetAt, updatedAt: new Date(now) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      // Concurrent first requests can race on the unique key; retry below.
      if (err?.code !== 11000) throw err;
    }

    const doc = await ProviderUsageCounter.findOneAndUpdate(
      { key, count: { $lte: limit - amount } },
      { $inc: { count: amount }, $set: { updatedAt: new Date(now) } },
      { new: true }
    ).lean();

    if (!doc) return { allowed: false, reason: "quota_exceeded", limit, resetAt: new Date((bucket + 1) * windowMs) };
    return { allowed: true, used: doc.count, remaining: Math.max(0, limit - doc.count), limit, resetAt: new Date((bucket + 1) * windowMs) };
  } catch (err) {
    return { allowed: false, reason: "quota_store_error", error: err?.message || "quota reservation failed" };
  }
}

module.exports = { reserveWindow };
