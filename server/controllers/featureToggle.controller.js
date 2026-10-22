const FeatureToggle = require("../models/FeatureToggle.model");

const DEFAULT_FEATURES = { flatmates: false, agentPortal: false, aiAssistant: false };

async function getPublicFeatureToggles(req, res) {
  try {
    const settings = await FeatureToggle.findOne({ key: "platform" }).lean();
    res.set("Cache-Control", "public, max-age=20");
    return res.json({
      flatmates: settings?.flatmates ?? DEFAULT_FEATURES.flatmates,
      agentPortal: settings?.agentPortal ?? DEFAULT_FEATURES.agentPortal,
      aiAssistant: settings?.aiAssistant ?? DEFAULT_FEATURES.aiAssistant,
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
    const aiAssistant = req.body?.aiAssistant;
    if (typeof flatmates !== "boolean" || typeof agentPortal !== "boolean") {
      return res.status(400).json({ message: "flatmates and agentPortal must be booleans." });
    }
    // Optional, so an older admin screen that does not send it never switches the assistant off or on.
    if (aiAssistant !== undefined && typeof aiAssistant !== "boolean") {
      return res.status(400).json({ message: "aiAssistant must be a boolean." });
    }

    const settings = await FeatureToggle.findOneAndUpdate(
      { key: "platform" },
      {
        $set: {
          flatmates,
          agentPortal,
          ...(typeof aiAssistant === "boolean" ? { aiAssistant } : {}),
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
        aiAssistant: Boolean(settings.aiAssistant),
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
