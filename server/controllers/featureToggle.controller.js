const FeatureToggle = require("../models/FeatureToggle.model");

const DEFAULT_FEATURES = { flatmates: false, agentPortal: false };

async function getPublicFeatureToggles(req, res) {
  try {
    const settings = await FeatureToggle.findOne({ key: "platform" }).lean();
    return res.json({
      flatmates: settings?.flatmates ?? DEFAULT_FEATURES.flatmates,
      agentPortal: settings?.agentPortal ?? DEFAULT_FEATURES.agentPortal,
    });
  } catch (error) {
    console.error("Error loading public feature toggles:", error);
    return res.status(500).json({ message: "Unable to load feature settings." });
  }
}

async function getAdminFeatureToggles(req, res) {
  return getPublicFeatureToggles(req, res);
}

async function updateAdminFeatureToggles(req, res) {
  try {
    const flatmates = req.body?.flatmates;
    const agentPortal = req.body?.agentPortal;
    if (typeof flatmates !== "boolean" || typeof agentPortal !== "boolean") {
      return res.status(400).json({ message: "flatmates and agentPortal must be booleans." });
    }

    const settings = await FeatureToggle.findOneAndUpdate(
      { key: "platform" },
      {
        $set: {
          flatmates,
          agentPortal,
          updatedBy: req.user?._id || null,
        },
        $setOnInsert: { key: "platform" },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      message: "Feature settings saved.",
      features: {
        flatmates: settings.flatmates,
        agentPortal: settings.agentPortal,
      },
    });
  } catch (error) {
    console.error("Error saving feature toggles:", error);
    return res.status(500).json({ message: "Unable to save feature settings." });
  }
}

module.exports = {
  getPublicFeatureToggles,
  getAdminFeatureToggles,
  updateAdminFeatureToggles,
};
