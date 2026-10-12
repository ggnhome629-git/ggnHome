const Agent = require("../models/Agent.model");
const User = require("../models/user.model");
const { issueAgentSession } = require("../utils/agentSession");

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function nextPartnerCode() {
  const counters = require("mongoose").connection.collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: "agentCode" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = result?.value?.seq ?? result?.seq;
  if (typeof seq !== "number") throw new Error("Could not allocate partner code");
  return `ggnhome-${String(seq).padStart(4, "0")}`;
}

/**
 * Called after the user proves control of their mobile number through the
 * existing OTP flow. No name, email, DOB, password, or documents are required
 * to create a basic PartnerHub account.
 */
async function registerPartner(req, res) {
  try {
    const user = req.user;
    if (!user || !user.mobileNumber || !user.isVerified || !user.otpVerifiedAt || Date.now() - new Date(user.otpVerifiedAt).getTime() > 10 * 60 * 1000) {
      return res.status(401).json({ message: "Verify your mobile number with OTP within the last 10 minutes before registering." });
    }
    const mobileNumber = normalizeMobile(user.mobileNumber);
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ message: "A valid Indian mobile number is required." });
    }

    let agent = await Agent.findOne({ mobileNumber });
    if (agent) {
      if (agent.roleType !== "Partner") {
        return res.status(409).json({ message: "This mobile number already belongs to an Agent account. Please contact support to convert it to Partner." });
      }
      if (agent.status === "suspended") {
        return res.status(403).json({ message: "This partner account is suspended. Please contact support." });
      }
      if (!agent.userId) {
        agent.userId = user._id;
        await agent.save();
      }
    } else {
      const agentCode = await nextPartnerCode();
      agent = await Agent.create({
        name: user.name || "Partner",
        mobileNumber,
        whatsappNumber: mobileNumber,
        agentCode,
        roleType: "Partner",
        userId: user._id,
        status: "active",
        isVerified: true,
        verificationStatus: "approved",
        verifiedAt: new Date(),
        lastLoginAt: new Date(),
        agentType: "individual",
      });
    }

    user.role = "Partner";
    user.isVerified = true;
    await user.save();

    const session = await issueAgentSession(req, res, user);
    if (!session.agentAccessToken) {
      return res.status(500).json({ message: "Partner was registered but a secure partner session could not be created. Please log in again." });
    }
    return res.status(201).json({
      success: true,
      message: "Partner registration complete.",
      agent: session.agent,
      agentAccessToken: session.agentAccessToken,
    });
  } catch (error) {
    console.error("registerPartner error:", error);
    if (error.code === 11000) return res.status(409).json({ message: "This mobile number is already registered." });
    return res.status(500).json({ message: "Could not register partner right now." });
  }
}

module.exports = { registerPartner };
