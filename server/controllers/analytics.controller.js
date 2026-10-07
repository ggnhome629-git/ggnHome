const PropertyAnalysis = require("../models/PropertyAnalysis.model");
const Enquiry = require("../models/EnquirySchema.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const User = require("../models/user.model");
const Visit = require("../models/Visit.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// GET /api/property-analysis/:id/funnel
exports.getFunnel = async (req, res) => {
  try {
    const { id } = req.params;
    const property = req.params._id;
    const viewsCount = await PropertyAnalysis.countDocuments({ property });
    const savesCount = await PropertyAnalysis.countDocuments({ property, "saves.user": { $exists: true } });
    const enquiriesCount = await Enquiry.countDocuments({ propertyId: property });
    const visitsCount = await Visit.countDocuments({ propertyId: property });
    const funnel = [
      { label: "Views", value: viewsCount, percent: viewsCount ? Math.round((savesCount / viewsCount) * 100) : 0 },
      { label: "Saves", value: savesCount, percent: savesCount ? Math.round((enquiriesCount / savesCount) * 100) : 0 },
      { label: "Enquiries", value: enquiriesCount, percent: enquiriesCount ? Math.round((visitsCount / enquiriesCount) * 100) : 0 },
      { label: "Visits", value: visitsCount, percent: 100 },
    ];
    return res.json({ success: true, funnel });
  } catch (err) {
    jsonError(res, 500, "Failed to load funnel");
  }
};

// GET /api/property-analysis/:id/health
exports.getHealth = async (req, res) => {
  try {
    const { id } = req.params;
    const property = req.params._id;
    const doc = await PropertyAnalysis.findOne({ property });
    if (!doc) return jsonError(res, 404, "Property analytics not found");
    const p = await RentalProperty.findById(property).select("images description isActive");
    const s = await SaleProperty.findById(property).select("images description isActive");
    const hasPhotos = (p && p.images && p.images.length >= 6) || (s && s.images && s.images.length >= 6);
    const hasDescription = (p && p.description && p.description.trim().length > 80) || (s && s.description && s.description.trim().length > 80);
    const hasVerified = (p && p.isActive) || (s && s.isActive);
    const checklist = [
      { key: "photos", label: "At least 6 photos", fixed: true, done: hasPhotos },
      { key: "description", label: "Description > 80 chars", fixed: true, done: hasDescription },
      { key: "verified", label: "Listing live and verified", fixed: true, done: hasVerified },
    ];
    const score = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
    return res.json({ success: true, score, checklist });
  } catch (err) {
    jsonError(res, 500, "Failed to load health");
  }
};

// GET /api/property-analysis/:id/export.csv
exports.exportCsv = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PropertyAnalysis.findOne({ property: id });
    if (!doc) return jsonError(res, 404, "Metrics not found");
    const lines = ["label,value"];
    for (const m of doc.summary || []) {
      lines.push(`${m.label},${m.value}`);
    }
    return res.set("Content-Type", "text/csv").send(lines.join("\n"));
  } catch (err) {
    jsonError(res, 500, "Failed to export");
  }
};
