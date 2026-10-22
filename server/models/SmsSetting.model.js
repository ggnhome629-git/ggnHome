const mongoose = require("mongoose");

// The GGN Home SMS limits, edited from the hidden SMS console. One document (key "ggnhome").
// mode "auto" = the built-in safe defaults; "custom" = the numbers below (always clamped to the hard caps).
const SmsSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    // When true, show GGN Home OTPs in the Android app instead of sending SMS. False preserves SMS delivery by default.
    showOtpOnAndroid: { type: Boolean, default: false },
    // Direct login: when true, website login auto-fills the OTP and signs in without SMS. False uses normal SMS.
    directOtpEnabled: { type: Boolean, default: false },
    mode: { type: String, enum: ["auto", "custom"], default: "auto" },
    dailyLimit: { type: Number },
    hourlyLimit: { type: Number },
    gapMinSec: { type: Number },
    gapMaxSec: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsSetting", SmsSettingSchema);
