const UserRequirement = require("../models/UserRequirement.model");
const User = require("../models/user.model");
const UserPreferenceForm = require("../models/userpreferenceForm.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");

function jsonError(res, status, message) {
  return res.status(status).json({ code: status >= 500 ? "SERVER_ERROR" : "ERROR", message });
}

// POST /api/requirements — create (rate-limited)
exports.createRequirement = async (req, res) => {
  try {
    const {
      userId,
      userName,
      mobileNumber,
      budgetMin,
      budgetMax,
      bhk,
      sectors,
      propertyType,
      furnishing,
      moveInFrom,
      pauseUntil,
      consentSms,
      consentWhatsApp,
    } = req.body;
    if (!mobileNumber || !mobileNumber.trim()) return jsonError(res, 400, "mobileNumber required");
    const normalized = mobileNumber.trim();
    const isLoggedIn = !!userId;
    if (!isLoggedIn && !/^070[0-9]{8}$/.test(normalized)) {
      return jsonError(res, 400, "Only Gurgaon mobiles can create requirements without login");
    }
    const budgetMinNum = budgetMin ? parseInt(budgetMin, 10) : 0;
    const budgetMaxNum = budgetMax ? parseInt(budgetMax, 10) : 0;
    if (budgetMaxNum <= budgetMinNum) return jsonError(res, 400, "budgetMax must be greater than budgetMin");
    const bhkArray = Array.isArray(bhk) ? bhk.filter((b) => b && b.trim()) : [];
    const sectorArray = Array.isArray(sectors) ? sectors.filter((s) => s && s.trim()) : [];

    let doc = null;
    if (isLoggedIn) {
      doc = await UserRequirement.findOneAndUpdate(
        { userId: userId },
        {
          userId,
          userName: userName || null,
          mobileNumber: normalized,
          budgetMin: budgetMinNum,
          budgetMax: budgetMaxNum,
          bhk: bhkArray,
          sectors: sectorArray,
          propertyType: propertyType || null,
          furnishing: furnishing || null,
          moveInFrom: moveInFrom ? new Date(moveInFrom) : null,
          pauseUntil: pauseUntil ? new Date(pauseUntil) : null,
          consentSms: consentSms ?? false,
          consentWhatsApp: consentWhatsApp ?? false,
          status: "active",
        },
        { upsert: true, new: true }
      );
    } else {
      doc = await UserRequirement.create({
        userName: userName || null,
        mobileNumber: normalized,
        budgetMin: budgetMinNum,
        budgetMax: budgetMaxNum,
        bhk: bhkArray,
        sectors: sectorArray,
        propertyType: propertyType || null,
        furnishing: furnishing || null,
        moveInFrom: moveInFrom ? new Date(moveInFrom) : null,
        pauseUntil: pauseUntil ? new Date(pauseUntil) : null,
        consentSms: consentSms ?? false,
        consentWhatsApp: consentWhatsApp ?? false,
        status: "active",
      });
    }
    return res.status(201).json({ success: true, requirement: doc });
  } catch (err) {
    if (err.code === 11000) return jsonError(res, 409, "Requirement already exists for this mobile");
    jsonError(res, 500, "Failed to save requirement");
  }
};

// GET /api/requirements/mine
exports.getMyRequirements = async (req, res) => {
  try {
    const { status = "active" } = req.query;
    const filter = { userId: req.user._id, status };
    const requirements = await UserRequirement.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, requirements });
  } catch (err) {
    jsonError(res, 500, "Failed to load requirements");
  }
};

// PATCH /api/requirements/:id
exports.updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pauseUntil, userName, budgetMin, budgetMax, bhk, sectors, propertyType, furnishing, moveInFrom } = req.body;
    const doc = await UserRequirement.findById(id);
    if (!doc) return jsonError(res, 404, "Requirement not found");
    if (doc.userId.toString() !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "You can only edit your own requirements");
    }
    if (status) doc.status = status;
    if (pauseUntil) doc.pauseUntil = new Date(pauseUntil);
    if (userName !== undefined) doc.userName = userName;
    if (budgetMin !== undefined) doc.budgetMin = parseInt(budgetMin, 10) || 0;
    if (budgetMax !== undefined) doc.budgetMax = parseInt(budgetMax, 10) || 0;
    if (bhk !== undefined) doc.bhk = Array.isArray(bhk) ? bhk.filter((b) => b && b.trim()) : [];
    if (sectors !== undefined) doc.sectors = Array.isArray(sectors) ? sectors.filter((s) => s && s.trim()) : [];
    if (propertyType !== undefined) doc.propertyType = propertyType;
    if (furnishing !== undefined) doc.furnishing = furnishing;
    if (moveInFrom !== undefined) doc.moveInFrom = new Date(moveInFrom);
    await doc.save();
    return res.json({ success: true, requirement: doc });
  } catch (err) {
    jsonError(res, 500, "Failed to update requirement");
  }
};

// DELETE /api/requirements/:id
exports.deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await UserRequirement.findById(id);
    if (!doc) return jsonError(res, 404, "Requirement not found");
    if (doc.userId.toString() !== req.user._id && String(req.user.role) !== "admin") {
      return jsonError(res, 403, "Not your requirement");
    }
    await doc.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    jsonError(res, 500, "Failed to delete requirement");
  }
};

// GET /api/requirements/preview — match count + 6 thumbnails (reuse X-Total-Count)
exports.previewRequirements = async (req, res) => {
  try {
    const { location, bhk, minPrice, maxPrice, type, furnishing } = req.query;
    if (!location || !location.trim()) return jsonError(res, 400, "location required");
    const sector = location.trim();
    const filter = { status: "active", $or: [{ budgetMin: 0 }, { budgetMax: { $gte: minPrice ? parseInt(minPrice, 10) : 0 } }] };
    // Sector + budget + BHK + type overlap.
    if (!isNaN(parseInt(minPrice, 10))) filter.$or.push({ budgetMax: { $gte: parseInt(minPrice, 10) } });
    const prefIds = await UserRequirement.find(filter);
    // For preview we reuse an existing count header the server exposes.
    res.set("X-Total-Count", String(prefIds.length));
    const sample = await RentalProperty.find({ isActive: true, sourcePortal: { $exists: false } })
      .limit(3)
      .select("title images Sector monthlyRent");
    const saleSample = await SaleProperty.find({ isActive: true, sourcePortal: { $exists: false } })
      .limit(3)
      .select("title images Sector price");
    return res.json({ success: true, requirements: prefIds.slice(0, 20), sample: [...sample, ...saleSample] });
  } catch (err) {
    jsonError(res, 500, "Failed to run preview");
  }
};
