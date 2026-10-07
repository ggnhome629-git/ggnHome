const mongoose = require("mongoose");

const priceEstimateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    shareId: { type: String, unique: true, sparse: true },
    inputs: { type: mongoose.Schema.Types.Mixed, default: null },
    low: { type: Number, min: 0, required: true },
    mid: { type: Number, min: 0, required: true },
    high: { type: Number, min: 0, required: true },
    pricePerSqft: { type: Number, min: 0, default: null },
    confidence: { type: String, trim: true, default: "medium" },
    model: { type: String, default: "property-price" },
  },
  { timestamps: true }
);

priceEstimateSchema.index({ shareId: 1 });
priceEstimateSchema.index({ createdAt: -1 });

const PriceEstimateLog = mongoose.model("PriceEstimateLog", priceEstimateSchema);

module.exports = PriceEstimateLog;
