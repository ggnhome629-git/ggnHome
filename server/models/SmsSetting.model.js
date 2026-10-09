const mongoose = require("mongoose");

// The GGN Home SMS limits, edited from the hidden SMS console. One document (key "ggnhome").
// mode "auto" = the built-in safe defaults; "custom" = the numbers below (always clamped to the hard caps).
const SmsSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    mode: { type: String, enum: ["auto", "custom"], default: "auto" },
    dailyLimit: { type: Number },
    hourlyLimit: { type: Number },
    gapMinSec: { type: Number },
    gapMaxSec: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsSetting", SmsSettingSchema);
