const mongoose = require("mongoose");

// Outgoing SMS waiting for the Android gateway app to pick up and send.
// Documents are deleted automatically 10 minutes after creation (TTL), so
// OTP text never lingers in the database.
const SmsQueueSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending", index: true },
  error: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

module.exports = mongoose.model("SmsQueue", SmsQueueSchema);
