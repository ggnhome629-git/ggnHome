const mongoose = require("mongoose");

// One document per phone running the ggnhome-sms-service app.
const SmsDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    name: { type: String, default: "Android phone" },
    // Admin can switch a phone off (e.g. SIM at risk of being blocked).
    enabled: { type: Boolean, default: true },
    lastSeen: { type: Date },
    // false while the phone is cooling down / at its hourly cap (anti-block pacing)
    ready: { type: Boolean, default: true },
    appVersion: { type: String },
    // Counters used to spread load and to stay under per-SIM daily limits.
    sentTotal: { type: Number, default: 0 },
    failedTotal: { type: Number, default: 0 },
    dayKey: { type: String }, // "YYYY-MM-DD" the sentToday counter belongs to
    sentToday: { type: Number, default: 0 },
    lastSentAt: { type: Date },
    // The earliest the server will hand this phone another message (random gap after each one).
    nextAllowedAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsDevice", SmsDeviceSchema);
