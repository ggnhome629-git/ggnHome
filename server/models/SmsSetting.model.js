const mongoose = require("mongoose");

// The GGN Home SMS limits, set from Stashr's SMS sender only. One document (key "ggnhome").
// A limit that is missing / null is switched off (no limit). Nothing is built into this server.
const SmsSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    // When true, show GGN Home OTPs in the Android app instead of sending SMS. False preserves SMS delivery by default.
    showOtpOnAndroid: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: null },
    hourlyLimit: { type: Number, default: null },
    gapMinSec: { type: Number, default: null },
    gapMaxSec: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsSetting", SmsSettingSchema);
