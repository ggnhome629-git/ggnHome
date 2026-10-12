const AdminDashboardPreferences = require("../models/AdminDashboardPreferences.model");

const isValidRoute = (route) =>
  typeof route === "string" &&
  route.length <= 160 &&
  /^\/(admin|partner)\/[a-zA-Z0-9/_-]+$/.test(route);

async function getDashboardPreferences(req, res) {
  try {
    const doc = await AdminDashboardPreferences.findOne({ adminId: req.user._id }).lean();
    return res.json({ success: true, hiddenRoutes: doc?.hiddenRoutes || [] });
  } catch (error) {
    console.error("[admin dashboard preferences] read failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not load dashboard preferences." });
  }
}

async function updateDashboardPreferences(req, res) {
  try {
    const hiddenRoutes = req.body?.hiddenRoutes;
    if (!Array.isArray(hiddenRoutes) || hiddenRoutes.length > 150 || !hiddenRoutes.every(isValidRoute)) {
      return res.status(400).json({ success: false, message: "hiddenRoutes must be an array of valid admin or partner routes." });
    }
    const normalized = [...new Set(hiddenRoutes)];
    const doc = await AdminDashboardPreferences.findOneAndUpdate(
      { adminId: req.user._id },
      { $set: { hiddenRoutes: normalized } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, hiddenRoutes: doc.hiddenRoutes });
  } catch (error) {
    console.error("[admin dashboard preferences] update failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not save dashboard preferences." });
  }
}

module.exports = { getDashboardPreferences, updateDashboardPreferences };
