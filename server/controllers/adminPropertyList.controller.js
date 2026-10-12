const mongoose = require("mongoose");
const RentalProperty = mongoose.models.RentalProperty || require("../models/RentalProperty.model");
const SaleProperty = mongoose.models.SaleProperty || require("../models/SaleProperty.model");
const Agent = require("../models/Agent.model");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shape a Rental/Sale document into the flat row the Property Manager page renders.
const toRow = (doc, kind) => {
  const p = doc.toObject ? doc.toObject() : doc;
  const config = p.totalArea?.configuration;
  return {
    _id: p._id,
    title: p.title,
    price: kind === "rent" ? p.monthlyRent : p.price,
    location: p.Sector || p.location || p.address || "",
    bhk: config || (p.bedrooms ? `${p.bedrooms} BHK` : ""),
    area: p.totalArea?.sqft ?? "",
    bath: p.bathrooms,
    source: p.sourcePortal || p.source || "Own",
    origin: p.sourcePortal ? "scraped" : "own",
    ownerType: p.ownerType || "Owner",
    status: p.status || "ACTIVE",
    isActive: !!p.isActive,
    isPending: !!(p.isPostedNew || p.isEdited),
    isPostedNew: !!p.isPostedNew,
    isEdited: !!p.isEdited,
    image: Array.isArray(p.images) ? p.images[0] || "" : "",
    listingType: kind,
    createdAt: p.createdAt,
    ownerName: p.ownerName || "",
    ownerMobile: p.partnerAgentId ? (p.ownernumber || "") : p.ranking?.source === "Partner" ? "" : (p.ownernumber || ""),
    agentUserId: p.agentUserId ? String(p.agentUserId) : "",
    rankingSource: p.ranking?.source || "",
    partnerAgentId: p.partnerAgentId ? String(p.partnerAgentId) : "",
    partnerName: p.partnerName || "",
    partnerMobile: p.partnerMobile || "",
    partnerEmail: p.partnerEmail || "",
  };
};

/**
 * GET /api/admin/properties?page&limit&search&source&status
 * Lists rental + sale properties together, newest first.
 */
const listAdminProperties = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { search, source, status, origin, state, approval, partnerAdded, partnerAgentId } = req.query;

    const filter = {};
    if (source) filter.source = String(source);
    if (partnerAdded === "true") {
      filter.$and = [...(filter.$and || []), { $or: [{ partnerAgentId: { $exists: true, $ne: null } }, { "ranking.source": "Partner" }] }];
    }
    if (partnerAgentId && mongoose.isValidObjectId(partnerAgentId)) {
      const partner = await Agent.findById(partnerAgentId).select("userId").lean();
      const partnerClauses = [{ partnerAgentId: new mongoose.Types.ObjectId(partnerAgentId) }];
      if (partner?.userId) partnerClauses.push({ agentUserId: partner.userId, ownerType: "Agent", "ranking.source": "Partner" });
      filter.$and = [...(filter.$and || []), { $or: partnerClauses }];
    }
    if (status) filter.status = String(status);
    if (origin === "scraped") filter.sourcePortal = { $exists: true, $ne: null };
    if (origin === "own") filter.sourcePortal = null;
    if (state === "active") filter.isActive = true;
    if (state === "inactive") filter.isActive = false;
    if (approval === "pending") filter.$and = [...(filter.$and || []), { $or: [{ isPostedNew: true }, { isEdited: true }] }];
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: rx }, { Sector: rx }, { address: rx }];
    }

    // Each collection is queried up to page*limit rows, then merged and sliced.
    const window = page * limit;
    const [rent, sale, rentTotal, saleTotal] = await Promise.all([
      RentalProperty.find(filter).sort({ createdAt: -1 }).limit(window),
      SaleProperty.find(filter).sort({ createdAt: -1 }).limit(window),
      RentalProperty.countDocuments(filter),
      SaleProperty.countDocuments(filter),
    ]);

    const rows = [...rent.map((d) => toRow(d, "rent")), ...sale.map((d) => toRow(d, "sale"))]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice((page - 1) * limit, page * limit);

    // Backfill partner contact labels for older PartnerHub listings. Older records
    // stored the partner's number as ownernumber, so don't present that as owner contact.
    const legacyUserIds = [...new Set(rows
      .filter((row) => row.rankingSource === "Partner" && !row.partnerName && row.agentUserId)
      .map((row) => row.agentUserId))];
    if (legacyUserIds.length) {
      const legacyAgents = await Agent.find({ userId: { $in: legacyUserIds } })
        .select("_id userId name mobileNumber email")
        .lean();
      const byUserId = new Map(legacyAgents.map((agent) => [String(agent.userId), agent]));
      rows.forEach((row) => {
        if (row.rankingSource !== "Partner" || row.partnerName) return;
        const agent = byUserId.get(row.agentUserId);
        if (!agent) return;
        row.partnerAgentId = String(agent._id);
        row.partnerName = agent.name || "";
        row.partnerMobile = agent.mobileNumber || "";
        row.partnerEmail = agent.email || "";
      });
    }

    res.json({ success: true, data: rows, meta: { total: rentTotal + saleTotal, page, limit } });
  } catch (err) {
    console.error("listAdminProperties error:", err);
    res.status(500).json({ success: false, message: "Failed to load properties" });
  }
};

const PENDING = { $or: [{ isPostedNew: true }, { isEdited: true }] };
const SCRAPED = { sourcePortal: { $exists: true, $ne: null } };
const OWN = { sourcePortal: null };

const countBoth = async (filter) => {
  const [a, b] = await Promise.all([RentalProperty.countDocuments(filter), SaleProperty.countDocuments(filter)]);
  return a + b;
};

/** GET /api/admin/properties/partners — partners available for Property Manager filtering. */
const listPartnerPropertyPartners = async (req, res) => {
  try {
    const agents = await Agent.find({ status: { $ne: "suspended" }, $or: [{ roleType: "Partner" }, { roleType: { $exists: false } }] })
      .select("_id name mobileNumber email agencyName status")
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, partners: agents.map((agent) => ({
      _id: String(agent._id),
      name: agent.name || "Partner",
      mobileNumber: agent.mobileNumber || "",
      email: agent.email || "",
      agencyName: agent.agencyName || "",
      status: agent.status || "pending",
    })) });
  } catch (err) {
    console.error("listPartnerPropertyPartners error:", err);
    res.status(500).json({ success: false, message: "Failed to load partners" });
  }
};

/** GET /api/admin/properties/counts — totals shown at the top of Property Manager. */
const getPropertyCounts = async (req, res) => {
  try {
    const [total, rental, sale, active, inactive, scraped, own, pendingScraped, pendingOwn] = await Promise.all([
      countBoth({}),
      RentalProperty.countDocuments({}),
      SaleProperty.countDocuments({}),
      countBoth({ isActive: true }),
      countBoth({ isActive: false }),
      countBoth(SCRAPED),
      countBoth(OWN),
      countBoth({ $and: [PENDING, SCRAPED] }),
      countBoth({ $and: [PENDING, OWN] }),
    ]);
    res.json({ success: true, counts: { total, rental, sale, active, inactive, scraped, own, pendingScraped, pendingOwn } });
  } catch (err) {
    console.error("getPropertyCounts error:", err);
    res.status(500).json({ success: false, message: "Failed to load counts" });
  }
};

/**
 * POST /api/admin/properties/bulk-approve
 * body: { ids: [...] } or { origin: "scraped" | "own" } to approve every pending listing of that kind.
 */
const bulkApproveProperties = async (req, res) => {
  try {
    const { ids, origin } = req.body || {};
    let filter;
    if (Array.isArray(ids) && ids.length) {
      const valid = ids.filter((id) => mongoose.isValidObjectId(id));
      filter = { _id: { $in: valid } };
    } else if (origin === "scraped") {
      filter = { $and: [PENDING, SCRAPED] };
    } else if (origin === "own") {
      filter = { $and: [PENDING, OWN] };
    } else {
      return res.status(400).json({ success: false, message: "Provide ids or origin" });
    }
    const update = { $set: { isActive: true, isPostedNew: false, isEdited: false } };
    const [r, s] = await Promise.all([RentalProperty.updateMany(filter, update), SaleProperty.updateMany(filter, update)]);
    res.json({ success: true, approved: (r.modifiedCount || 0) + (s.modifiedCount || 0) });
  } catch (err) {
    console.error("bulkApproveProperties error:", err);
    res.status(500).json({ success: false, message: "Bulk approve failed" });
  }
};

module.exports = { listAdminProperties, getPropertyCounts, bulkApproveProperties, listPartnerPropertyPartners };
