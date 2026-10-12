const mongoose = require("mongoose");

const AdminDashboardPreferencesSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  hiddenRoutes: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.AdminDashboardPreferences ||
  mongoose.model("AdminDashboardPreferences", AdminDashboardPreferencesSchema);
