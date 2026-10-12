const mongoose = require("mongoose");

const AppDownloadSchema = new mongoose.Schema({
  key: { type: String, enum: ["ggnhome", "partner", "sms-service"], required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  url: { type: String, default: "" },
  version: { type: String, default: "" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.models.AppDownload || mongoose.model("AppDownload", AppDownloadSchema);
