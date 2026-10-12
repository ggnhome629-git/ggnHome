const mongoose = require("mongoose");

/**
 * One tiny document per UTC day with atomic $inc counters for the AI
 * consultant's success metrics (conversations, searches, fallbacks, speech
 * failures…). Cheap enough for the free MongoDB tier; expires after 400 days.
 */
const aiConsultantMetricSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
    counters: { type: Map, of: Number, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

aiConsultantMetricSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AiConsultantMetric", aiConsultantMetricSchema);
