/**
 * Role-gated OTP logins for the Partner Hub and the Admin console.
 *
 * Each endpoint checks the mobile number's role BEFORE anything else, so an OTP
 * (which costs an SMS) is never sent to a number that cannot use that portal, and
 * a wrong-role number never gets a session. The OTP itself is still created,
 * sent, rate limited and verified by the normal handlers in login.controller.js.
 */
const User = require("../models/user.model");
const Agent = require("../models/Agent.model");
const SaleProperty = require("../models/SaleProperty.model");
const RentalProperty = require("../models/Rentalproperty.model");
const { allocatePartnerCode } = require("../utils/partnerCode");
const { requestOtp, verifyOtp } = require("./login.controller");

const MOBILE_RE = /^\d{10}$/;

// Returns null when this number may use the Partner Hub, otherwise { status, code, message }.
async function partnerProblem(mobileNumber) {
  let agent = await Agent.findOne({ mobileNumber });
  if (!agent) {
    // No registration: any new mobile number becomes a Partner on first OTP sign-in.
    // Admin numbers use their own workspace instead.
    let user = await User.findOne({ mobileNumber });
    if (user?.role === "admin") {
      return { status: 403, code: "NOT_A_PARTNER", message: "Administrators open PartnerHub from the admin panel." };
    }
    if (!user) user = await User.create({ mobileNumber, role: "renter", isVerified: false });
    if (await Agent.exists({ userId: user._id })) {
      return { status: 403, code: "NOT_A_PARTNER", message: "This account is linked to another Agent/Partner profile. Contact GgnHome support." };
    }
    agent = await Agent.create({
      name: "Partner",
      mobileNumber,
      whatsappNumber: mobileNumber,
      agentCode: await allocatePartnerCode(),
      roleType: "Partner",
      userId: user._id,
      status: "active",
      isVerified: true,
      verificationStatus: "approved",
      agentType: "individual",
    });
  }

  let isPartner = agent.roleType === "Partner";
  // Same rule as issueAgentSession(): old PartnerHub accounts stored as Agents count
  // as Partners once they own Partner-attributed listings. Keep the two in sync.
  if (!isPartner && agent.userId) {
    const legacyPartnerFilter = {
      $or: [
        { partnerAgentId: agent._id },
        { agentUserId: agent.userId, ownerType: "Agent", "ranking.source": "Partner" },
      ],
    };
    const [sale, rental] = await Promise.all([
      SaleProperty.exists(legacyPartnerFilter),
      RentalProperty.exists(legacyPartnerFilter),
    ]);
    isPartner = Boolean(sale || rental);
  }
  if (!isPartner) {
    return {
      status: 403,
      code: "NOT_A_PARTNER",
      message: "This mobile number is registered as an Agent, not a Partner. Contact a GgnHome administrator.",
    };
  }

  const status = String(agent.status || "pending").toLowerCase();
  if (status === "suspended") {
    return { status: 403, code: "PARTNER_SUSPENDED", message: "This Partner account is suspended. Contact GgnHome support." };
  }
  if (status !== "active") {
    return { status: 403, code: "PARTNER_NOT_ACTIVE", message: "This Partner account is not active yet. Contact a GgnHome administrator." };
  }
  return null;
}

// Returns null when this number belongs to an admin account.
async function adminProblem(mobileNumber) {
  const user = await User.findOne({ mobileNumber }).select("role");
  if (!user || user.role !== "admin") {
    return { status: 403, code: "NOT_AN_ADMIN", message: "This mobile number does not have admin access." };
  }
  return null;
}

// Wraps a normal OTP handler: validate the number, check its role, then delegate.
const gate = (problemFor, handler, label) => async (req, res) => {
  try {
    const mobileNumber = String(req.body?.mobileNumber || "").replace(/\D/g, "").slice(-10);
    if (!MOBILE_RE.test(mobileNumber)) {
      return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
    }
    const problem = await problemFor(mobileNumber);
    if (problem) return res.status(problem.status).json({ code: problem.code, message: problem.message });

    req.body.mobileNumber = mobileNumber;
    delete req.body.email; // these portals are mobile-number logins only
    return handler(req, res);
  } catch (error) {
    console.error(`${label} failed:`, error?.name, error?.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.partnerRequestOtp = gate(partnerProblem, requestOtp, "partnerRequestOtp");
exports.partnerVerifyOtp = gate(partnerProblem, verifyOtp, "partnerVerifyOtp");
exports.adminRequestOtp = gate(adminProblem, requestOtp, "adminRequestOtp");
exports.adminVerifyOtp = gate(adminProblem, verifyOtp, "adminVerifyOtp");
