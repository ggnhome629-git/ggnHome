const mongoose = require("mongoose");

// Outgoing SMS waiting for the Android gateway app to pick up and send.
// Documents are deleted automatically 10 minutes after creation (TTL), so
// OTP text never lingers in the database.
const SmsQueueSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", index: true },
  error: { type: String },
  // Phone chosen at random when queued; null = any phone may take it.
  assignedDevice: { type: String, default: null },
  sentBy: { type: String },
  claimedAt: { type: Date },
  // Retry bookkeeping: a failed send goes to a *different* phone.
  attempts: { type: Number, default: 0 },
  failedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

// Lookup used by every phone's poll.
SmsQueueSchema.index({ status: 1, assignedDevice: 1, createdAt: 1 });

module.exports = mongoose.model("SmsQueue", SmsQueueSchema);
