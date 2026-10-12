// Controller for handling Enquiry-related operations:
// - Creating new enquiries linked to rental or sale properties
// - Retrieving all enquiries in a denormalized format

// Import models
const Enquiry = require("../models/EnquirySchema.model.js");
const RentalProperty = require("../models/Rentalproperty.model.js");
const SaleProperty = require("../models/SaleProperty.model.js");
const User = require("../models/user.model.js");
const { debouncedRankingCalculation } = require("../hooks/propertyRankingHook");


// ------------------------------
// Create a new Enquiry
// ------------------------------
const createEnquiry = async (req, res) => {
  const { propertyId, message, brokerage } = req.body;
  const user = req.user || null;
  const submittedName = String(req.body.customerName || req.body.name || user?.name || user?.fullName || "").trim().slice(0, 120);
  const submittedMobile = String(req.body.customerMobile || req.body.phone || user?.mobileNumber || "").replace(/\D/g, "").slice(-10);

  try {
    if (
      typeof brokerage !== "number" ||
      brokerage < 1499 ||
      brokerage > 5999
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid brokerage amount"
      });
    }

    if (!submittedName || !/^[6-9]\d{9}$/.test(submittedMobile)) {
      return res.status(400).json({ success: false, message: "Customer name and a valid 10-digit mobile number are required." });
    }

    // 1️⃣ Try rental first
    let property = await RentalProperty.findById(propertyId);
    let propertyType = "rental";

    // 2️⃣ If not rental, try sale
    if (!property) {
      property = await SaleProperty.findById(propertyId);
      propertyType = "sale";
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found"
      });
    }

    // 3️⃣ Determine enquiry recipient (explicit ownership model)
    let agentUserId = null;
    let ownerUserId = null;
    let enquiryFor = null;

    // ✅ Agent-owned property
    if (property.ownerType === "Partner") {
      enquiryFor = "Partner";
      agentUserId = property.agentUserId;
    }
    // Agent-owned property
    else if (property.ownerType === "Agent") {
      enquiryFor = "Agent";
      agentUserId = property.agentUserId;
    }
    // ✅ Owner-owned property
    else if (property.ownerType === "Owner") {
      enquiryFor = "Owner";
      ownerUserId =
        propertyType === "rental"
          ? property.owner
          : property.ownerId;
    }
    // ✅ Admin-owned property (platform listing)
    else if (property.ownerType === "Admin") {
      enquiryFor = "Admin";
      // No agentUserId / ownerUserId required
    }

    // Scraped / ownerless listings have no agent or owner user: the lead goes
    // to admin instead of being rejected.
    if (!agentUserId && !ownerUserId) {
      enquiryFor = "Admin";
    }

    // 5️⃣ Create enquiry
    const ownerIdForSnapshot = propertyType === "rental" ? (property.owner || null) : (property.ownerId || property.owner || null);
    let ownerName = String(property.ownerName || "").trim();
    if (!ownerName && ownerIdForSnapshot) {
      const ownerRecord = await User.findById(ownerIdForSnapshot).select("name fullName").lean();
      ownerName = ownerRecord?.name || ownerRecord?.fullName || "";
    }

    const enquiryData = {
      propertyId: property._id,
      propertyType,
      agentUserId: agentUserId || null,
      ownerUserId: ownerUserId || null,
      propertyAddress: property.address || property.location || property.Sector || property.title || "N/A",
      propertyPrice:
        (propertyType === "rental"
          ? property.monthlyRent
          : property.price) || 0,
      userId: user?._id || null,
      userEmail: user?.email || String(req.body.customerEmail || "").trim().slice(0, 180),
      userMobile: submittedMobile,
      customerName: submittedName,
      ownerName,
      sourcePortal: property.sourcePortal || undefined,
      sourceUrl: property.sourcePortal ? (property.sourceUrl || undefined) : undefined,
      enquiryFor: enquiryFor || "Admin",
      message: message || "",
      brokerage
    };

    const enquiry = new Enquiry(enquiryData);
    await enquiry.save();

    // Auto-recalculate ranking asynchronously with debounce (engagement metric changed)
    const rankingSource = property.ownerType === "Partner" ? "Partner" : property.ownerType === "Agent" ? "Agent" : "Own";
    debouncedRankingCalculation(propertyId, propertyType, rankingSource, 5000);

    return res.status(201).json({
      success: true,
      enquiry
    });

  } catch (err) {
    console.error("❌ Enquiry Creation Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create enquiry",
      error: err.message
    });
  }
};


// ------------------------------
// Retrieve all Enquiries
// ------------------------------
const getEnquiries = async (req, res) => {
  try {
    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // 1) Count total enquiries for pagination metadata
    const totalEnquiries = await Enquiry.countDocuments();
    if (totalEnquiries === 0) {
      return res.status(200).json({ success: true, page, limit, totalEnquiries, totalPages: 0, enquiries: [] });
    }

    // 2) Fetch paginated enquiries (most recent first)
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

    // 3) Collect property IDs by type from the current page
    const rentalIds = [];
    const saleIds = [];
    for (const e of enquiries) {
      if (!e.propertyId) continue;
      if (e.propertyType === 'rental') rentalIds.push(e.propertyId);
      else if (e.propertyType === 'sale') saleIds.push(e.propertyId);
    }

    // 4) Fetch property documents in two batched queries
    const [rentalProps, saleProps] = await Promise.all([
      rentalIds.length ? RentalProperty.find({ _id: { $in: rentalIds } }).lean() : Promise.resolve([]),
      saleIds.length ? SaleProperty.find({ _id: { $in: saleIds } }).lean() : Promise.resolve([]),
    ]);

    // 5) Map properties by id for O(1) lookup
    const rentalMap = new Map(rentalProps.map(p => [p._id.toString(), p]));
    const saleMap = new Map(saleProps.map(p => [p._id.toString(), p]));

    // 6) Collect all unique owner ids from properties
    const ownerIdSet = new Set();
    for (const p of rentalProps) if (p && p.owner) ownerIdSet.add(p.owner.toString());
    for (const p of saleProps) if (p && (p.ownerId || p.owner)) ownerIdSet.add((p.ownerId || p.owner).toString());

    // 7) Fetch owners in a single query (if any)
    let ownerMap = new Map();
    if (ownerIdSet.size) {
      const owners = await User.find({ _id: { $in: [...ownerIdSet] } }).select('_id name email mobileNumber').lean();
      ownerMap = new Map(owners.map(o => [o._id.toString(), o]));
    }

    // 8) Build enriched enquiries array by mapping properties & owners back to enquiries
    const enquiryUsers = await User.find({ _id: { $in: enquiries.map(e => e.userId).filter(Boolean) } }).select("_id name fullName email mobileNumber").lean();
    const enquiryUserMap = new Map(enquiryUsers.map(u => [String(u._id), u]));

    const enriched = enquiries.map(enq => {
      const pid = enq.propertyId ? enq.propertyId.toString() : null;
      const prop = enq.propertyType === 'rental' ? rentalMap.get(pid) : saleMap.get(pid);
      const ownerId = prop ? (prop.owner || prop.ownerId || null) : null;
      const owner = ownerId ? ownerMap.get(ownerId.toString()) : null;

      const customer = enquiryUserMap.get(String(enq.userId || "")) || null;
      return {
        ...enq.toObject(),
        customerName: enq.customerName || customer?.name || customer?.fullName || "Customer",
        customer: customer ? { _id: customer._id, name: customer.name || customer.fullName || "Customer", email: customer.email || enq.userEmail || "", mobileNumber: customer.mobileNumber || enq.userMobile || "" } : { name: enq.customerName || "Customer", email: enq.userEmail || "", mobileNumber: enq.userMobile || "" },
        ownerName: enq.ownerName || prop?.ownerName || owner?.name || owner?.fullName || "",
        sourcePortal: enq.sourcePortal || prop?.sourcePortal || "",
        sourceUrl: enq.sourceUrl || prop?.sourceUrl || "",
        property: prop || null,
        owner: owner || null,
      };
    });

    // 9) Return enriched results with pagination metadata
    return res.status(200).json({
      success: true,
      page,
      limit,
      totalEnquiries,
      totalPages: Math.ceil(totalEnquiries / limit),
      enquiries: enriched
    });
  } catch (err) {
    console.error('❌ Fetching Enquiries Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch enquiries' });
  }
};

// ------------------------------
// Retrieve Enquiries for Logged-in Agent
// ------------------------------
const getAgentEnquiries = async (req, res) => {
  try {
    let agentUserId = null;

    // Normal user-auth agent
    if (req.user && req.user.role === "Agent") {
      agentUserId = req.user._id;
    }
    // Incognito / agent-auth
    else if (req.agent && req.agent.userId) {
      agentUserId = req.agent.userId;
    }

    if (!agentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Agent identity not found."
      });
    }

    const enquiries = await Enquiry.find({ agentUserId })
      .sort({ createdAt: -1 });

    // 🔁 Modify brokerage ONLY in response, and REMOVE enquirer PII from agent view
    const transformedEnquiries = enquiries.map((e) => {
      const originalBrokerage = e.brokerage;
      const agentBrokerage =
        originalBrokerage > 500
          ? (originalBrokerage - 500) / 2
          : 0;
      return {
        _id: e._id,
        propertyId: e.propertyId,
        propertyType: e.propertyType,
        propertyAddress: e.propertyAddress,
        propertyPrice: e.propertyPrice,
        // 🔒 Enquirer PII intentionally hidden from agent
        // userEmail: removed
        // userMobile: removed
        message: e.message,
        brokerage: agentBrokerage,
        createdAt: e.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      total: transformedEnquiries.length,
      enquiries: transformedEnquiries
    });

  } catch (err) {
    console.error("❌ Fetch Agent Enquiries Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent enquiries"
    });
  }
};

// ------------------------------
// Unlock Enquirer Contact Details (Eye Button)
// ------------------------------
const unlockEnquiryContact = async (req, res) => {
  try {
    let agentUserId = null;

    // ✅ user-auth agent (non-incognito)
    if (req.user && req.user.role === "Agent") {
      agentUserId = req.user._id;
    }
    // ✅ agent-auth (incognito / token-based)
    else if (req.agent && req.agent.userId) {
      agentUserId = req.agent.userId;
    }

    if (!agentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Agents only."
      });
    }

    const { enquiryId } = req.params;

    if (!enquiryId) {
      return res.status(400).json({
        success: false,
        message: "Enquiry ID is required"
      });
    }

    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      agentUserId
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found or not authorized"
      });
    }

    // Already unlocked
    if (
      enquiry.contactUnlockedBy &&
      enquiry.contactUnlockedBy.toString() === agentUserId.toString()
    ) {
      return res.status(200).json({
        success: true,
        userEmail: enquiry.userEmail,
        userMobile: enquiry.userMobile
      });
    }

    enquiry.contactUnlockedBy = agentUserId;
    enquiry.contactUnlockedAt = new Date();
    await enquiry.save();

    return res.status(200).json({
      success: true,
      userEmail: enquiry.userEmail,
      userMobile: enquiry.userMobile
    });

  } catch (err) {
    console.error("❌ Unlock Enquiry Contact Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unlock enquiry contact"
    });
  }
};

const deleteEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;

    if (!enquiryId) {
      return res.status(400).json({ success: false, message: "Enquiry ID is required" });
    }

    const deleted = await Enquiry.findByIdAndDelete(enquiryId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    return res.status(200).json({ success: true, message: "Enquiry deleted successfully" });
  } catch (err) {
    console.error("❌ Delete Enquiry Error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete enquiry", error: err.message });
  }
};



/**
 * PartnerHub enquiries are scoped to properties belonging to the authenticated
 * partner. Internal scraped-source metadata is deliberately omitted from this
 * response; admins can see sourcePortal/sourceUrl in the admin enquiries view.
 */
const getPartnerEnquiries = async (req, res) => {
  try {
    if (!req.agent) return res.status(401).json({ success: false, message: "Partner authentication required" });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const [totalEnquiries, enquiries] = await Promise.all([
      Enquiry.countDocuments(),
      Enquiry.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const rentalIds = enquiries.filter(e => e.propertyType === "rental" && e.propertyId).map(e => e.propertyId);
    const saleIds = enquiries.filter(e => e.propertyType === "sale" && e.propertyId).map(e => e.propertyId);
    const [rentalProps, saleProps] = await Promise.all([
      rentalIds.length ? RentalProperty.find({ _id: { $in: rentalIds } }).lean() : [],
      saleIds.length ? SaleProperty.find({ _id: { $in: saleIds } }).lean() : [],
    ]);
    const propertyMap = new Map([
      ...rentalProps.map(p => [String(p._id), { ...p, propertyType: "rental", price: p.monthlyRent }]),
      ...saleProps.map(p => [String(p._id), { ...p, propertyType: "sale", price: p.price }]),
    ]);
    const ownerIds = [...new Set([...rentalProps.map(p => p.owner), ...saleProps.map(p => p.ownerId || p.owner)].filter(Boolean).map(String))];
    const userIds = [...new Set(enquiries.map(e => e.userId).filter(Boolean).map(String))];
    const [users, owners] = await Promise.all([
      userIds.length ? User.find({ _id: { $in: userIds } }).select("_id name fullName email mobileNumber").lean() : [],
      ownerIds.length ? User.find({ _id: { $in: ownerIds } }).select("_id name fullName").lean() : [],
    ]);
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const ownerMap = new Map(owners.map(u => [String(u._id), u]));

    const enriched = enquiries.map(e => {
      const p = propertyMap.get(String(e.propertyId));
      const user = userMap.get(String(e.userId || ""));
      const ownerId = p ? String(p.owner || p.ownerId || "") : "";
      const owner = ownerMap.get(ownerId);
      const ownerName = e.ownerName || p?.ownerName || owner?.name || owner?.fullName || "";
      return {
        _id: e._id,
        propertyId: e.propertyId,
        propertyType: e.propertyType,
        propertyAddress: e.propertyAddress,
        propertyPrice: e.propertyPrice,
        customerName: e.customerName || user?.name || user?.fullName || "Customer",
        userName: e.customerName || user?.name || user?.fullName || "Customer",
        userEmail: e.userEmail || user?.email || "",
        userMobile: e.userMobile || user?.mobileNumber || "",
        message: e.message || "",
        brokerage: e.brokerage,
        createdAt: e.createdAt,
        ownerName: ownerName || "No owner of this property present.",
        property: p ? {
          _id: p._id,
          title: p.title,
          address: p.address || p.location || p.Sector || "",
          Sector: p.Sector || "",
          price: p.price,
          monthlyRent: p.monthlyRent,
          propertyType: p.propertyType,
          ownerType: p.ownerType,
          images: p.images || [],
        } : null,
        // Scraped-source fields and source URLs are intentionally omitted here.
      };
    });
    return res.json({ success: true, page, limit, totalEnquiries, totalPages: Math.ceil(totalEnquiries / limit), enquiries: enriched });
  } catch (error) {
    console.error("getPartnerEnquiries error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch partner enquiries" });
  }
};

module.exports = {
  createEnquiry,
  getPartnerEnquiries,
  getEnquiries,
  getAgentEnquiries,
  unlockEnquiryContact,
  deleteEnquiry
};