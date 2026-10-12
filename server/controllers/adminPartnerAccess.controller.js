const Agent = require("../models/Agent.model");
const User = require("../models/user.model");
const mongoose = require("mongoose");

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function allocatePartnerCode() {
  const counters = mongoose.connection.collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: "agentCode" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = result?.value?.seq ?? result?.seq;
  if (!Number.isInteger(seq) || seq < 1) throw new Error("Could not allocate a partner code");
  return `ggnhome-${String(seq).padStart(4, "0")}`;
}

/**
 * Admin allowlists a partner mobile number. Possession of the number is
 * proved later by the existing OTP flow; this endpoint never sends an OTP.
 */
async function registerPartnerAccess(req, res) {
  try {
    const mobileNumber = normalizeMobile(req.body?.mobileNumber);
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: "Enter a valid 10-digit Indian mobile number." });
    }

    const existing = await Agent.findOne({ mobileNumber });
    if (existing) {
      if (existing.roleType !== "Partner") {
        return res.status(409).json({ success: false, message: "This mobile number belongs to an Agent account. Convert it through the admin workflow before granting Partner access." });
      }
      return res.status(409).json({ success: false, message: "Partner access is already registered for this mobile number.", partner: { id: existing._id, mobileNumber: existing.mobileNumber, status: existing.status } });
    }

    let user = await User.findOne({ mobileNumber });
    if (user?.role === "admin") {
      return res.status(409).json({ success: false, message: "An administrator's mobile number cannot be registered as a Partner." });
    }
    if (user && await Agent.exists({ userId: user._id })) {
      return res.status(409).json({ success: false, message: "This user is already linked to another Agent/Partner account." });
    }
    // Create the base user record now so the Agent unique sparse userId is populated from day one.
    // OTP remains unverified until the partner logs in.
    if (!user) user = await User.create({ mobileNumber, role: "renter", isVerified: false });

    const agentCode = await allocatePartnerCode();
    const partner = await Agent.create({
      name: "Partner",
      mobileNumber,
      whatsappNumber: mobileNumber,
      agentCode,
      roleType: "Partner",
      userId: user._id,
      status: "active",
      isVerified: true,
      verificationStatus: "approved",
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      agentType: "individual",
    });

    return res.status(201).json({
      success: true,
      message: "Partner access registered. The partner must verify this mobile number with OTP to sign in.",
      partner: { id: partner._id, mobileNumber: partner.mobileNumber, status: partner.status, createdAt: partner.createdAt },
    });
  } catch (error) {
    console.error("[admin partner access] create failed:", error.message);
    if (error.code === 11000) return res.status(409).json({ success: false, message: "This mobile number or partner code is already registered." });
    return res.status(500).json({ success: false, message: "Could not register Partner access." });
  }
}

async function listPartnerAccess(req, res) {
  try {
    const search = String(req.query.search || "").trim();
    const filter = { roleType: "Partner" };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.mobileNumber = { $regex: escaped };
    }
    const partners = await Agent.find(filter)
      .select("_id name mobileNumber agentCode status createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, partners });
  } catch (error) {
    console.error("[admin partner access] list failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not load Partner access list." });
  }
}

module.exports = { registerPartnerAccess, listPartnerAccess };
