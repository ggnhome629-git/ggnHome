const DocSuggestion = require("../models/DocSuggestion.model");

// Sections of the /doc page that accept suggestions.
const SECTIONS = ["portals", "apps", "post-property", "features", "open-items", "general"];

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

// GET /api/docs/suggestions?section= — public, newest first. Only text, name and time are returned.
exports.listDocSuggestions = async (req, res) => {
  try {
    const filter = SECTIONS.includes(req.query.section) ? { section: req.query.section } : {};
    const items = await DocSuggestion.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("section text name createdAt")
      .lean();
    return res.json({ success: true, items });
  } catch (err) {
    return jsonError(res, 500, "Failed to load suggestions");
  }
};

// POST /api/docs/suggestions — public (rate limited at the route); name is optional.
exports.createDocSuggestion = async (req, res) => {
  const section = String(req.body?.section || "");
  const text = String(req.body?.text || "").trim();
  const name = String(req.body?.name || "").trim().slice(0, 60);

  if (!SECTIONS.includes(section)) return jsonError(res, 400, "Unknown section.");
  if (text.length < 3 || text.length > 600) return jsonError(res, 400, "Suggestion must be 3 to 600 characters.");

  try {
    const item = await DocSuggestion.create({ section, text, name });
    return res.status(201).json({
      success: true,
      item: { section: item.section, text: item.text, name: item.name, createdAt: item.createdAt },
    });
  } catch (err) {
    return jsonError(res, 500, "Could not save your suggestion.");
  }
};
