const Agent = require("../models/Agent.model");

/**
 * Creates/reuses a dedicated Agent profile linked to the authenticated admin.
 * This endpoint is admin-only; the returned token is scoped to the normal
 * PartnerHub API and does not expose an impersonation option for other users.
 */
async function createAdminPartnerSession(req, res) {
  try {
    const user = req.user;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Administrator access required." });
    }

    let agent = await Agent.findOne({ userId: user._id });
    if (!agent) {
      // The workspace has its own partner identity, separate from any real
      // partner that happens to share the admin's contact number.
      let mobileNumber = String(9000000000 + (parseInt(String(user._id).slice(-7), 16) % 999999999));
      while (await Agent.exists({ mobileNumber })) {
        mobileNumber = String(Number(mobileNumber) >= 9999999999 ? 9000000000 : Number(mobileNumber) + 1);
      }

      agent = await Agent.create({
        userId: user._id,
        name: user.name || user.fullName || "Admin Partner Workspace",
        email: user.email,
        mobileNumber,
        agentCode: `ggnhome-admin-${String(user._id)}`,
        dob: new Date("2000-01-01T00:00:00.000Z"),
        agentType: "individual",
        status: "active",
        isVerified: true,
        verificationStatus: "approved",
        verifiedBy: user._id,
        verifiedAt: new Date(),
        bio: "Dedicated PartnerHub workspace for the GgnHome administrator.",
      });
    } else {
      // Keep this dedicated workspace usable without changing the admin role.
      agent.status = "active";
      agent.isVerified = true;
      agent.verificationStatus = "approved";
      if (!agent.name) agent.name = user.name || user.fullName || "Admin Partner Workspace";
      if (!agent.email && user.email) agent.email = user.email;
      await agent.save();
    }

    const agentAccessToken = agent.getAccessToken();
    agent.AccessTokenAgent = agentAccessToken;
    await agent.save();

    return res.json({
      agentAccessToken,
      profile: { id: String(agent._id), name: agent.name, agentCode: agent.agentCode },
    });
  } catch (error) {
    console.error("createAdminPartnerSession failed:", error);
    return res.status(500).json({ message: "Unable to open the admin PartnerHub workspace." });
  }
}

module.exports = { createAdminPartnerSession };
