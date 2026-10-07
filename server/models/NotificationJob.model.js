const mongoose = require("mongoose");

const notificationJobSchema = new mongoose.Schema(
  {
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: String, enum: ["sms", "email", "push", "in_app"], required: true },
    template: { type: String, required: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    runAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3 },
    status: {
      type: String,
      enum: ["queued", "sending", "sent", "failed", "retrying", "done"],
      default: "queued",
    },
    lastError: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationJobSchema.index({ status: 1, runAt: 1 });
notificationJobSchema.index({ runAt: 1 });

const NotificationJob = mongoose.model("NotificationJob", notificationJobSchema);

module.exports = NotificationJob;
