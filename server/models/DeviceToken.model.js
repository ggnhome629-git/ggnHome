const mongoose = require("mongoose");

/**
 * FCM registration tokens for the GgnHome Android app. A token may exist
 * before the visitor logs in; `userId` is attached once they do.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    platform: { type: String, enum: ["android", "ios"], default: "android" },
    appVersion: { type: String, trim: true },
    popularPushes: { type: Boolean, default: true },
    personalPushes: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    lastPersonalPushAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);
