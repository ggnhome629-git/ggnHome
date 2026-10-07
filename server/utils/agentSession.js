const Agent = require("../models/Agent.model");

function isLocalHost(host) {
  const h = String(host || "").split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

// Same cookie rules as the agent login: Lax locally, cross-site in production.
function agentCookie(req, maxAgeMs) {
  const local = isLocalHost(req && (req.hostname || (req.headers && req.headers.host))) || process.env.NODE_ENV !== "production";
  return local
    ? { httpOnly: true, secure: false, sameSite: "Lax", maxAge: maxAgeMs, path: "/" }
    : { httpOnly: true, secure: true, sameSite: "None", maxAge: maxAgeMs, path: "/" };
}

/**
 * Single sign-on: after a user has proved their mobile number with an OTP,
 * look for the agent account on that number. An approved agent also gets
 * agent tokens (cookie + response), so one login opens both the main site
 * and the agent dashboard. Pending / suspended agents only get their status.
 *
 * Returns { agent: { status, name, agentCode } | null, agentAccessToken? }.
 */
async function issueAgentSession(req, res, user) {
  if (!user) return { agent: null };
  const agent = await Agent.findOne({ $or: [{ userId: user._id }, ...(user.mobileNumber ? [{ mobileNumber: user.mobileNumber }] : [])] });
  if (!agent) return { agent: null };

  if (!agent.userId) agent.userId = user._id;
  const status = String(agent.status || "pending").toLowerCase();
  const summary = { status, name: agent.name, agentCode: agent.agentCode };
  if (status !== "active") {
    await agent.save();
    return { agent: summary };
  }

  if (user.role !== "admin" && user.role !== "Agent") {
    user.role = "Agent";
    await user.save();
  }
  const agentAccessToken = agent.getAccessToken();
  const agentRefreshToken = agent.getRefreshToken();
  agent.AccessTokenAgent = agentAccessToken;
  agent.RefreshTokenAgent = agentRefreshToken;
  await agent.save();
  res.cookie("accessTokenAgent", agentAccessToken, agentCookie(req, 60 * 60 * 1000));
  res.cookie("refreshTokenAgent", agentRefreshToken, agentCookie(req, 7 * 24 * 60 * 60 * 1000));
  return { agent: summary, agentAccessToken };
}

module.exports = { issueAgentSession, agentCookie };
