const mongoose = require("mongoose");

// Small key/value store for settings an admin can change at runtime (no redeploy).
const AppSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AppSetting || mongoose.model("AppSetting", AppSettingSchema);
