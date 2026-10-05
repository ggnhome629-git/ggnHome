const mongoose = require("mongoose");

// Permanent-ish record of every SMS handed to the gateway, for the admin page.
// The message text is NOT stored (it contains the OTP) — only who/when/how.
// Deleted automatically after 30 days.
const SmsLogSchema = new mongoose.Schema({
  queueId: { type: String, index: true },
  phoneNumber: { type: String, required: true },
  kind: { type: String, default: "otp" }, // "otp" | "test"
  status: { type: String, enum: ["queued", "sending", "sent", "failed", "expired"], default: "queued" },
  assignedDevice: { type: String },
  deviceId: { type: String }, // phone that actually sent it
  deviceName: { type: String },
  error: { type: String },
  // Carrier delivery report from the sending phone (not all carriers send one).
  delivery: { type: String, enum: ["delivered", "undelivered"] },
  deliveryDetail: { type: String },
  deliveredAt: { type: Date },
  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 3600 },
});

module.exports = mongoose.model("SmsLog", SmsLogSchema);
