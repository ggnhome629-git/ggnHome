const mongoose = require("mongoose");

const providerUsageCounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  resetAt: { type: Date, required: true, expires: 0 },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.models.ProviderUsageCounter ||
  mongoose.model("ProviderUsageCounter", providerUsageCounterSchema);
