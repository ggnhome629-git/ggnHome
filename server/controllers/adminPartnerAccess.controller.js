const Agent = require("../models/Agent.model");

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

/** Admin adds their own account as a Partner (listed with other partners). */
async function registerSelfAsPartner(req, res) {
  try {
    const user = req.user;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Administrator access required." });
    }
    const agent = await ensureAdminAgent(user);
    if (agent.roleType !== "Partner") {
      agent.roleType = "Partner";
      await agent.save();
    }
    return res.status(201).json({
      success: true,
      message: "You are now registered as a Partner.",
      partner: { id: agent._id, mobileNumber: agent.mobileNumber, status: agent.status },
    });
  } catch (error) {
    console.error("[admin partner access] self add failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not add admin as Partner." });
  }
}

module.exports = { listPartnerAccess };
