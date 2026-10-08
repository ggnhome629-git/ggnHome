const mongoose = require("mongoose");

/** One row per property we have already pushed, so we never repeat ourselves. */
const pushLogSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    propertyType: { type: String, enum: ["rental", "sale"], required: true },
    kind: { type: String, enum: ["popular", "personal"], default: "popular" },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model("PushLog", pushLogSchema);
