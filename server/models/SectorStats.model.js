const mongoose = require("mongoose");

const sectorStatsSchema = new mongoose.Schema(
  {
    sector: { type: String, required: true, trim: true },
    type: { type: String, enum: ["sale", "rental"], required: true },
    avgPrice: { type: Number, min: 0, default: 0 },
    avgRent: { type: Number, min: 0, default: 0 },
    pricePerSqft: { type: Number, min: 0, default: 0 },
    count: { type: Number, default: 0 },
    p25: { type: Number, min: 0, default: 0 },
    p75: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

sectorStatsSchema.index({ sector: 1, type: 1 }, { unique: true });
sectorStatsSchema.index({ updatedAt: -1 });

const SectorStats = mongoose.model("SectorStats", sectorStatsSchema);

module.exports = SectorStats;
