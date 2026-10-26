const FeatureToggle = require("../models/FeatureToggle.model");
const { setScrapedEnabledCache } = require("../utils/scrapedListings");

const DEFAULT_FEATURES = { flatmates: false, agentPortal: false, aiAssistant: false, scrapedListings: true };

async function getPublicFeatureToggles(req, res) {
  try {
    const settings = await FeatureToggle.findOne({ key: "platform" }).lean();
    res.set("Cache-Control", "public, max-age=20");
    return res.json({
      flatmates: settings?.flatmates ?? DEFAULT_FEATURES.flatmates,
      agentPortal: settings?.agentPortal ?? DEFAULT_FEATURES.agentPortal,
      aiAssistant: settings?.aiAssistant ?? DEFAULT_FEATURES.aiAssistant,
      scrapedListings: settings?.scrapedListings ?? DEFAULT_FEATURES.scrapedListings,
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

/**
 * PUT /api/admin/feature-toggles/scraped-listings  { enabled: boolean }
 * Shows or hides every scraped (imported) listing on the public site and
 * locks or unlocks the scraper. Cached listing responses would otherwise keep
 * the old state for minutes, so the server read cache is cleared and
 * visitors' browsers are told to refresh.
 */
async function updateScrapedListingsToggle(req, res) {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be a boolean." });
  }
  try {
    const settings = await FeatureToggle.findOneAndUpdate(
      { key: "platform" },
      { $set: { scrapedListings: enabled, updatedBy: req.user?._id || null }, $setOnInsert: { key: "platform" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    setScrapedEnabledCache(settings.scrapedListings);

    const { _internals } = require("./cachePurge.controller");
    const [redis, browsers] = await Promise.all([
      _internals.clearRedisCache(),
      _internals.bumpVersion("site", req.user?._id).then(() => true, () => false),
    ]);

    return res.json({
      message: enabled
        ? "Scraped properties are visible and the scraper is unlocked."
        : "Scraped properties are hidden and the scraper is locked.",
      scrapedListings: settings.scrapedListings !== false,
      cache: { redisCleared: Boolean(redis.cleared), browsersRefreshed: browsers },
    });
  } catch (error) {
    console.error("Error saving scraped listings toggle:", error);
    return res.status(500).json({ message: "Unable to save the scraped properties setting." });
  }
}

module.exports = {
  updateScrapedListingsToggle,
  getPublicFeatureToggles,
  getAdminFeatureToggles,
  updateAdminFeatureToggles,
};
