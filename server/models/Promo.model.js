const mongoose = require("mongoose");

// Admin-managed promo cards shown on the dashboard and between search results.
const PromoSchema = new mongoose.Schema(
  {
    overline: { type: String, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 90 },
    text: { type: String, trim: true, maxlength: 200 },
    ctaLabel: { type: String, trim: true, maxlength: 30, default: "Know more" },
    // Internal path ("/rewards") or full https URL.
    link: { type: String, trim: true, maxlength: 300, default: "/" },
    theme: { type: String, enum: ["gold", "navy", "teal", "indigo", "cyan", "rose"], default: "navy" },
    icon: { type: String, enum: ["gift", "home", "list", "calculator", "car", "sparkles", "percent", "megaphone"], default: "sparkles" },
    imageUrl: { type: String, trim: true, maxlength: 500 },
    // "banner" = the one-line strip at the very top of the dashboard.
    placements: {
      type: [{ type: String, enum: ["dashboard", "search", "banner"] }],
      default: ["dashboard", "search"],
    },
    audience: { type: String, enum: ["all", "rent", "sale"], default: "all" },
    // Higher weight = picked more often in the random rotation.
    weight: { type: Number, min: 1, max: 10, default: 1 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PromoSchema.index({ isActive: 1, placements: 1 });

module.exports = mongoose.model("Promo", PromoSchema);
